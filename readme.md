**LÖVE on Acode**  
---

### Overview

**LÖVE Launcher** is an Acode plugin that makes LÖVE2D (Lua game framework) development easier on Android. It provides:

- A ready-to-use **LÖVE2D project template**
- One-click **packaging** of your project into a `.love` file

---

### Usage

#### 1. Creating a New LÖVE2D Project

1. Open Acode’s file browser.
2. Tap the [**✚**] button → **New Project**.
3. Select **LÖVE** from the template list.
4. Name your project and create it.

The plugin will automatically generate:
- `main.lua`
- `conf.lua`
- `.luarc.json`
- `.loveignore`

#### 2. Packaging Your Project

1. Make sure your LÖVE2D project is opened in Acode.
2. Open the Command Palette (`Ctrl + Shift + P`).
3. Type and select: **LÖVE Launcher: Pack current project**
4. A `.love` file will be generated in your project root (e.g. `MyGame.love`).

#### 3. Running Your Game

1. Make sure you have installed [LÖVE for Android](https://github.com/love2d/love-android/releases/latest).
2. Select **LÖVE Launcher: Run current project in LÖVE for Android** in the Command Palette.
3. ~~You will see an app chooser, then select **LÖVE for Android**.~~
    > If the Acode version is later than `1.13.5-nightly.7a667de`, no selection is required.
4. The game will be launched on your Android device.

> [!Note]
> If [Click Run](https://acode.app/plugin/acode.plugin.clickrun) is installed, simply click the [**▶**] button instead of using the command palette.

---

### Packaging Ignore

You can control which files and folders are ignored when packaging by editing `.loveignore` file.

It follows the **same rules** as Git's `.gitignore` file.

**Default content:**

```txt
.*
*.love
```

This will ignore all hidden files and folders (e.g. `.git`, `.vscode`, `.luarc.json`, and `.loveignore` itself).

You can add more patterns as needed.

---

### Requirements

- Acode version `minVersionCode: 967` or higher.
- [Click Run](https://acode.app/plugin/acode.plugin.clickrun) plugin for optional [**▶**] button.
- [LÖVE for Android](https://github.com/love2d/love-android/releases/latest) installed for running game.

---

**Happy game developing with LÖVE!** ❤️

Feel free to open issues or submit pull requests.
