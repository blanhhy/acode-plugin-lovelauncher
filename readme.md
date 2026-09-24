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
- `.acode/PROJTYPE` 
  (project type marker)
- `.acode/pack_files.json`
  (packaging configuration)

#### 2. Packaging Your Project

1. Make sure your LÖVE2D project is opened in Acode.
2. Open the Command Palette (`Ctrl + Shift + P`).
3. Type and select: **LÖVE Launcher: Pack current project**
4. A `.love` file will be generated in your project root (e.g. `MyGame.love`).

> [!Note]
> If [Click Run](https://acode.app/plugin/acode.plugin.clickrun) is installed, simply click the [**▶**] button and select **Pack LÖVE**.

---

### Packaging Configuration

You can control which files and folders are included in the `.love` file by editing:

```
.acode/pack_files.json
```

**Default template content:**

```json
[
  "conf.lua",
  "main.lua",
  "assets",
  "lib"
]
```

**Rules:**
- You can list individual files or entire directories.
- Directories are added recursively.
- Non-existent paths don't matter.

---

### Requirements

- The project must be opened in Acode.
- The currently active file must belong to a LÖVE2D project.
- Acode version `minVersionCode: 967` or higher.

---

### Limitations

- **Cannot directly run** `.love` files in love-android (Acode currently does not support passing Content URIs to external activities).
- Packaging is done purely in JavaScript using `fflate`.

Future updates may add direct launching once Acode improves its API.

---

**Happy game developing with LÖVE!** ❤️

Feel free to open issues or submit pull requests.