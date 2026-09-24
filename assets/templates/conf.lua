-- Conf Constants
GAME_NAME = "Template Game"
PKG_NAME = "org.example.mygame"

---See [wiki](https://love2d.org/wiki/Config_Files)
---@param t table game configuration options
function love.conf(t)
    t.window.title = GAME_NAME
    t.identity = PKG_NAME
    t.externalstorage = true
end
