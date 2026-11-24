import plugin from "../plugin.json";
import { zip } from "fflate";
import ignore from "ignore";

const openFolder = acode?.require("openFolder");
const commands = acode?.require("commands");
const projects = acode?.require("projects");
const confirm = acode?.require("confirm");
const toast = acode?.require("toast");
const alert = acode?.require("alert");
const Url = acode?.require("Url");
const FS = acode?.require("fs");

const CLICK_RUN_PLUGIN_ID = "acode.plugin.clickrun";

class LoveLauncher {
    /**
     * @param {string} name
     */
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
        if (!(await ignoreFs.exists())) { // 怎么处理其实无关紧要，因为缺失.loveignore不会识别为LOVE项目
            const template = await FS(`${this.baseUrl}assets/templates/.loveignore`);
            await template.copyTo(ignorePath);
            console.warn(`Missing .loveignore file: ${ignorePath}, populated with defaults.`);
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
        const zipData = await new Promise((resolve, reject) => {
            zip(dataMap, (err, bytes) => {
                if (err) reject(err);
                else resolve(bytes.buffer);
            });
        });

        const stat = await projDir.stat();
        const name = stat.name + ".love";

        const outPath = Url.join(baseUrl, name);
        const outFs = await FS(outPath);

        const existing = await outFs.exists();
        if (!existing) return projDir.createFile(name, zipData);

        await outFs.writeFile(zipData);
        return outPath;
    }

    /**
     * @param {string} baseUrl
     */
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
            toast("Packaging starting...", 3000);
            const path = await this.packLove(baseUrl);
            toast("Packaging successful!", 3000);
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
        try { await acode.waitForPlugin(CLICK_RUN_PLUGIN_ID); } catch {
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

        const runnable = async (cxt) => !!cxt.folder && await this.checkProj(cxt.folder.url);
        const packlove = async (cxt) => this.packProj(cxt.folder);
        const runlove  = async (cxt) => this.runProj(cxt.folder);

        this.disposeRunnerRun = runButton.registerProjectRunner({
            id: "lovelauncher.project.run",
            name: "Run LÖVE",
            icon: "play_arrow",
            runnable: runnable,
            run: runlove,
        });

        this.disposeRunnerPack = runButton.registerProjectRunner({
            id: "lovelauncher.project.pack",
            name: "Pack LÖVE",
            icon: "favorite",
            runnable: runnable,
            run: packlove,
        });
    }

    async runProj(folder) {
        const path = await this.packProj(folder);
        if (!path) { return; }
        if (!system.launchAppWithFile) {
            system.fileAction(path, Url.basename(path), "VIEW", "application/x-love-game", () => {
                alert(
                    "Running Failed",
                    "Packaging was successful, but file action failed."
                )
            });
            return;
        }
        system.launchAppWithFile({
            app: "org.love2d.android",
            className: "org.love2d.android.GameActivity",
            fileUri: path,
            mimeType: "application/x-love-game",
        },
            (result) => console.log(result.uris, result.component), 
            (err) => {
                alert(
                    "Running Failed",
                    "Packaging was successful, but launching love2d failed."
                )
                console.error(err);
            }
        );
    }
    
    initCommand() {
        commands.addCommand({
            name: "lovelauncher.packlove",
            description: "LÖVE Launcher: Pack current project",
            exec: () => this.packProj(),
        });
        commands.addCommand({
            name: "lovelauncher.runlove",
            description: "LÖVE Launcher: Run current project in LÖVE for Android",
            exec: () => this.runProj(),
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
            {
                key: "install_love_android",
                text: "Install LÖVE for Android",
                info: "Use LÖVE for Android to run the game",
            },
        ],
        cb: async (key) => {
            if (key === "install_click_run") {
                await acode.installPlugin(CLICK_RUN_PLUGIN_ID, plugin.name);
            } else if (key === "install_love_android") {
                const isConfirm = await confirm(
                    "Install LÖVE for Android",
                    "You are about to download LÖVE for Android in GitHub Releases. Are you sure?",
                );
                if (!isConfirm) return;
                const DOWNLOAD_URL = "https://github.com/love2d/love-android/releases/latest";
                system.openInBrowser(DOWNLOAD_URL);
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
        commands.removeCommand("lovelauncher.runlove");
        instance.disposeRunnerPack?.();
        instance.disposeRunnerRun?.();
    }
    
    acode.setPluginInit(plugin.id, init, settings);
    acode.setPluginUnmount(plugin.id, destroy);
}
