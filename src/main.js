import plugin from "../plugin.json";
import { zipSync } from "fflate";
import ignore from "ignore";

const CLICK_RUN_PLUGIN_ID = "acode.plugin.clickrun";
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
                ".luarc.json": await read(".luarc.json"),
                ".loveignore": await read(".loveignore"),
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
     * 递归将未被 .loveignore 忽略的文件添加到 dataMap。
     * @param {string} dirPath 当前目录路径
     * @param {Record<string, Uint8Array>} dataMap 文件映射表
     * @param {object} ignoreRules .loveignore 规则
     * @param {string} relativeDir 当前目录相对于项目根目录的路径
     */
    async addDirectoryToMap(dirPath, dataMap, ignoreRules, relativeDir = "") {
        const dir = await FS(dirPath);
        const entries = await dir.lsDir();
        for (const entry of entries) {
            const fullPath = entry.url;
            const relPath = relativeDir
                ? `${relativeDir}/${entry.name}`
                : entry.name;
            const ignorePath = entry.isDirectory ? `${relPath}/` : relPath;

            if (ignoreRules.ignores(ignorePath)) continue;

            if (entry.isFile) {
                const fileFs = await FS(fullPath);
                const content = await fileFs.readFile();
                dataMap[relPath] = new Uint8Array(content);
            } else if (entry.isDirectory) {
                await this.addDirectoryToMap(
                    fullPath,
                    dataMap,
                    ignoreRules,
                    relPath,
                );
            }
        }
    }

    /**
     * 根据 .loveignore 收集需要打包的文件
     * @param {string} baseUrl 项目根目录
     * @returns {Promise<Record<string, Uint8Array>>} 文件映射
     */
    async collectFilesFromIgnore(baseUrl) {
        const ignorePath = Url.join(baseUrl, ".loveignore");
        const ignoreFs = await FS(ignorePath);
        if (!(await ignoreFs.exists())) {
            throw new Error(`Missing .loveignore file: ${ignorePath}`);
        }

        const stat = await ignoreFs.stat();
        if (!stat.isFile) {
            throw new Error(`.loveignore is not a file: ${ignorePath}`);
        }

        let ignoreRules;
        try {
            const content = await ignoreFs.readFile("utf8");
            ignoreRules = ignore().add(content);
        } catch (e) {
            throw new Error(
                `[LOVE Launcher] Failed to parse .loveignore: ${e.message}`,
            );
        }

        const dataMap = {};
        await this.addDirectoryToMap(baseUrl, dataMap, ignoreRules);
        return dataMap;
    }

    /**
     * @param {string} baseUrl 项目路径前缀
     * @returns {Promise<string>} 输出路径
     */
    async packLove(baseUrl) {
        const projDir = await FS(baseUrl);
        const dataMap = await this.collectFilesFromIgnore(baseUrl);
        const zipData = zipSync(dataMap).buffer;

        const stat = await projDir.stat();
        const name = stat.name + ".love";

        const outPath = Url.join(baseUrl, name);
        const outFs = await FS(outPath);

        const existing = await outFs.exists();
        if (!existing) return projDir.createFile(name, zipData);

        await outFs.writeFile(zipData);
        return outPath;
    }

    async checkProj(baseUrl) {
        const url = Url.join(baseUrl, ".loveignore");
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
        return true;
    }

    async packProj(folder = openFolder.find(editorManager.activeFile?.uri)) {
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
            console.error("[LOVE Launcher] Error packaging project:", e);
            alert(
                "Packaging Failed",
                `Project: ${folder.title}\nError: ${e.message}`,
            );
            return;
        }
    }

    async initRunner() {
        if (!await acode.waitForPlugin(CLICK_RUN_PLUGIN_ID)) {
            console.info("[LOVE Launcher] Click Run is not installed, the run button is disabled");
            return;
        }
        const runButton = acode.require("runButton");
        if (!runButton) {
            console.warn("[LOVE Launcher] Click Run is loaded but has no runButton module");
            return;
        }
        return this.useRunButton(runButton);
    }

    useRunButton(runButton) {
        if (this.destroyed) return;
        console.info("[LOVE Launcher] registering the LÖVE project runner with Click Run");

        const runnable = async (context) => !!context.folder && await this.checkProj(context.folder.url);
        const run = async (context) => this.runProj(context.folder);

        this.disposeRunner = runButton.registerProjectRunner({
            id: "lovelauncher.project",
            name: "Pack LÖVE",
            runnable: runnable,
            run: run,
        });
    }

    // TODO: 实现love.js集成
    // TODO: 给acode增加能构造Content Uri的api以使用love-android App
    async runProj(folder) {
        const path = await this.packProj(folder);
        if (!path) { return; }
        const name = Url.basename(path);
        alert(
            "WIP: Running LÖVE",
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

    const settings = {
        list: [
            {
                key: "install_click_run",
                text: "Install Click Run",
                info: "Use Click Run to show the run button",
            },
        ],
        cb: async (key) => {
            if (key === "install_click_run") {
                await acode.installPlugin(CLICK_RUN_PLUGIN_ID, plugin.name);
            }
        }
    }
    
    const init = (baseUrl, $page, options) => {
        if (!baseUrl.endsWith("/")) {
            baseUrl += "/";
        }
        instance.baseUrl = baseUrl;
        instance.destroyed = false;
        instance.initTemplate();
        instance.initCommand();
        instance.initRunner();
    }

    const destroy = () => {
        instance.destroyed = true;
        commands.removeCommand("lovelauncher.packlove");
        instance.disposeRunner?.();
    }
    
    acode.setPluginInit(plugin.id, init, settings);
    acode.setPluginUnmount(plugin.id, destroy);
}
