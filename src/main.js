import plugin from "../plugin.json";
import { zipSync } from "fflate";

const openFolder = acode?.require("openFolder");
const commands = acode?.require("commands");
const projects = acode?.require("projects");
const alert = acode?.require("alert");
const Url = acode?.require("Url");
const FS = acode?.require("fs");

class LoveLauncher {    
    async getAsset(name) {
        const res = await fetch(`${this.baseUrl}assets/${name}`);
        return res;
    }

    async initTemplate() {
        const read = async (name) => {
            const res = await this.getAsset("templates/" + name);
            return res.text();
        };

        const getTemplate = async () => {
            return {
                "conf.lua": await read("conf.lua"),
                "main.lua": await read("main.lua"),
                ".acode/PROJTYPE": "LOVE2D",
                ".acode/pack_files.json": JSON.stringify([
                    "conf.lua",
                    "main.lua",
                    "assets",
                    "lib",
                ]),
            };
        };

        const icon = await (await this.getAsset("icon.png"))
            .blob()
            .then((blob) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            });

        projects.set("LÖVE", getTemplate, icon);
    }

    /**
     * 递归将目录下所有文件添加到 dataMap
     * @param {string} dirPath 目录绝对路径
     * @param {string} baseUrl 项目根目录绝对路径（用于计算相对路径）
     * @param {Map} dataMap 文件映射表
     */
    async addDirectoryToMap(dirPath, baseUrl, dataMap) {
        const dir = await FS(dirPath);
        const entries = await dir.lsDir();
        for (const entry of entries) {
            const fullPath = entry.url;
            const relPath = fullPath.substring(baseUrl.length).replace(/^\/+/, "");
            if (entry.isFile) {
                const fileFs = await FS(fullPath);
                const content = await fileFs.readFile();
                dataMap[relPath] = new Uint8Array(content);
            } else if (entry.isDirectory) {
                await this.addDirectoryToMap(fullPath, baseUrl, dataMap);
            }
        }
    }

    /**
     * 根据配置文件收集需要打包的文件
     * @param {string} baseUrl 项目根目录
     * @returns {Promise<Record<string, Uint8Array>>} 文件映射
     */
    async collectFilesFromConfig(baseUrl) {
        const configPath = Url.join(baseUrl, ".acode/pack_files.json");
        const configFs = await FS(configPath);
        const configExists = await configFs.exists();
        if (!configExists) {
            const errMsg = `Missing configuration file: ${configPath}\nPlease create it and list files/directories to include.`
            alert("Packaging Failed", errMsg)
            throw new Error(errMsg);
        }

        let includeList;
        try {
            const content = await configFs.readFile("utf8");
            includeList = JSON.parse(content);
            if (!Array.isArray(includeList)) {
                throw new Error("pack_files.json must contain an array of paths.");
            }
        } catch (e) {
            throw new Error(`Failed to parse pack_files.json: ${e.message}`);
        }

        const dataMap = {};

        for (const relPath of includeList) {
            const absolutePath = Url.join(baseUrl, relPath);
            const item = await FS(absolutePath);
            const exists = await item.exists();
            if (!exists) {
                console.warn(`[Warning] Path does not exist, skipping: ${relPath}`);
                continue;
            }

            const stat = await item.stat();
            if (stat.isFile) {
                const content = await item.readFile();
                const key = relPath.replace(/^\/+/, ""); // 去除'/'前缀
                dataMap[key] = new Uint8Array(content);
            } else if (stat.isDirectory) {
                await this.addDirectoryToMap(absolutePath, baseUrl, dataMap);
            } else {
                console.warn(`[Warning] Unknown entry type, skipping: ${relPath}`);
            }
        }

        return dataMap;
    }

    /**
     * @param {string} baseUrl 项目路径前缀
     * @returns {Promise<string>} 输出路径
     */
    async packLove(baseUrl) {
        const projDir = await FS(baseUrl);
        const dataMap = await this.collectFilesFromConfig(baseUrl);
        const zipData = zipSync(dataMap).buffer;

        const stat = await projDir.stat();
        const name = stat.name + ".love";

        const outPath = Url.join(baseUrl,name);
        const outFs = await FS(outPath);

        const existing = await outFs.exists();
        if (!existing) return projDir.createFile(name, zipData);

        outFs.writeFile(zipData);
        return outPath;
    }

    async checkProj(baseUrl) {
        const url = Url.join(baseUrl, ".acode/PROJTYPE");
        const pt = await FS(url);
        const existing = await pt.exists();
        if (!existing) {
            console.log(`[Project] ${url} does not exist`);
            return false;
        }
        const stat = await pt.stat();
        if (!stat.isFile) {
            console.log(`[Project] ${url} is not a file`);
            console.log(stat);
            return false;
        }
        const content = await pt.readFile("utf8");
        if (!content) {
            console.warn(`[Project] Failed to read ${url}`);
            return false;
        }
        return content.includes("LOVE2D");
    }

    async packProj() {
        const folder = openFolder.find(editorManager.activeFile.uri);

        if (!folder) {
            alert(
                "Packaging Failed",
                "Your current file is not from any project. Please open a Love2D project and code in it first.",
            );
            return;
        }

        const baseUrl = folder.url;
        const isLoveProj = await this.checkProj(baseUrl);

        if (!isLoveProj) {
            alert(
                "Packaging Failed",
                `${folder.title} is not a supported Love2D project.`,
            );
            return;
        }

        try {
            const path = await this.packLove(baseUrl);
            toast("Packaging LOVE successful!", 3000);
            folder.reload(); // 刷新文件列表
            return path
        } catch (e) {
            console.error("Packaging error:", e);
            alert(
                "Packaging Failed",
                `Project: ${folder.title}\nError: ${e.message}`,
            );
            return;
        }
    }

    initRunButton() {
        this.$runBtn = document.createElement("span");
        this.$runBtn.className = "icon play_arrow";
        this.$runBtn.setAttribute("action", "run");
        this.$runBtn.onclick = () => this.runProj();
        this.$runBtn.title = "Run Love";

        const listener = async () => {
            if (this.$runBtn.isConnected) {
                this.$runBtn.remove();
            }
            const folder = openFolder.find(editorManager.activeFile.uri);
            const isLoveProj = folder? await this.checkProj(folder.url): false;
            if (isLoveProj) {
                const $header = document.querySelector("#root")?.querySelector('header');
                $header?.insertBefore(this.$runBtn, $header.lastChild);
            }
        }
    
        editorManager.on('switch-file', listener);
        editorManager.on('rename-file', listener);

        return listener()
    }

    // TODO: 实现love.js集成
    // TODO: 给acode增加能构造Content Uri的api以使用love-android App
    async runProj() {
        const path = await this.packProj();
        if (!path) { return; }
        const name = Url.basename(path);
        alert(
            "Unfinished Feature",
            `Packaging Successful! Your .love file is ${name}.\n\nHowever, running .love is still under development.`
        )
    }
    
    initCommand() {
        commands.addCommand({
            name: "lovelauncher.packlove",
            description: "LÖVE Launcher: Pack current project",
            exec: () => this.packProj(),
        });
    }
}


// Main
if (window.acode) {
    const instance = new LoveLauncher();
    
    const init = async (baseUrl, $page, options) => {
        if (!baseUrl.endsWith("/")) {
            baseUrl += "/";
        }
        instance.baseUrl = baseUrl;
        try {
            instance.initTemplate();
            instance.initCommand();
            instance.initRunButton();
        } catch(e) {
            console.error("Error initializing LoveLauncher:", e);
        }
    }

    const destroy = async () => {
        try {
            commands.removeCommand("lovelauncher.packlove");
            instance.$runBtn.remove();
        } catch(e) {
            console.warn('Error cleaning up for LoveLauncher:', e);
        }
    }
    
    acode.setPluginInit(plugin.id, init);
    acode.setPluginUnmount(plugin.id, destroy);
}
