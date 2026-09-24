**LÖVE on Acode**  
---

### Overview

**LÖVE Launcher** is an Acode plugin that makes LÖVE2D (Lua game framework) development easier on Android. It provides:

- A ready-to-use **LÖVE2D project template**
- One-click **packaging** of your project into a `.love` file

> [!WARNING]
> Breaking change in `v1.0.3`,
> See [changelog](changelog.md) for details and migration guide.

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

> [!Note]
> If [Click Run](https://acode.app/plugin/acode.plugin.clickrun) is installed, simply click the [**▶**] button and select **Pack LÖVE**.

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

---

### Limitations

- **Cannot directly run** `.love` files in love-android.

> Acode currently does not support passing Content URIs to external activities.

Future updates will add direct launching once Acode improves its API.

---

**Happy game developing with LÖVE!** ❤️

Feel free to open issues or submit pull requests.
