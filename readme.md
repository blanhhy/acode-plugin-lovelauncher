**LÖVE Launcher**  
*Acode Plugin for LÖVE2D Game Development*

---

### Overview

**LÖVE Launcher** is an Acode plugin that makes LÖVE2D (Lua game framework) development easier on Android. It provides:

- A ready-to-use **LÖVE2D project template**
- One-click **packaging** of your project into a `.love` file

> **Note**: Due to current Acode API limitations, direct launching of `.love` files in **love-android** is not yet supported.

---

### Features

- Create new LÖVE2D projects directly from Acode’s “New Project” menu
- Pack your project into a standard `.love` file
- Customizable packaging via `.acode/pack_files.json`
- Clean default template with basic `main.lua` and `conf.lua`

---

### Installation

1. Download the latest plugin from the [Releases](https://github.com/blanhhy/acode-plugin-lovelauncher/releases) page.
2. Install it via **Acode → Plugins → Install from .zip**.
3. Restart Acode.

---

### Usage

#### 1. Creating a New LÖVE2D Project

1. Open Acode’s file browser.
2. Tap the **+** button → **New Project**.
3. Select **LÖVE** from the template list.
4. Name your project and create it.

The plugin will automatically generate:
- `main.lua`
- `conf.lua`
- `.acode/PROJTYPE` (internal marker)
- `.acode/pack_files.json` (packaging configuration)

#### 2. Packaging Your Project

1. Make sure your LÖVE2D project is opened in Acode.
2. Open the **Command Palette** (`Ctrl + Shift + P`).
3. Type and select: **LÖVE Launcher: Pack current project**
4. A `.love` file will be generated in your project root (e.g. `MyGame.love`).

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
- Non-existent paths are skipped with a warning.

---

### Requirements

- The project must be opened in Acode.
- The currently active file must belong to a LÖVE2D project (detected via `.acode/PROJTYPE`).
- Acode version compatible with `minVersionCode: 967` or higher.

---

### Limitations

- **Cannot directly run** `.love` files in love-android (Acode currently does not support passing Content URIs to external activities).
- Packaging is done purely in JavaScript using `fflate`.

Future updates may add direct launching once Acode improves its API.

---

**Happy game developing with LÖVE!** ❤️

Feel free to open issues or submit pull requests.