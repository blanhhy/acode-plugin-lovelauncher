### `v1.0.4`

- add a temporary implementation for running LÖVE.
- fix run button registration issue.

### `v1.0.3`

- use `.loveignore` file to both ignore files when packaging and mark the project type as LÖVE 2D, instead of `pack_files.json` & `PROJTYPE`.

> **Migration Guide**:\
> Create a `.loveignore` file in your old project root.
> e.g.:
> ```txt
> .*
> *.love
> ```
> Then, you can delete `.acode` folder.

### `v1.0.2`

- use the [**▶**] button of the [Click Run](https://acode.app/plugin/acode.plugin.clickrun) plugin.

### `v1.0.1`

- fix wrong URL concatenation.

### `v1.0.0`

- add a LÖVE2D project template.
- implement LÖVE2D project marking and recognition.
- implement packaging into .love files.
