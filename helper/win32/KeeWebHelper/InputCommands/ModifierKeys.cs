using System;

namespace KeeWebHelper.InputCommands
{
    [Flags]
    enum ModifierKeys : byte
    {
        None = 0,
        Ctrl = 1,
        Alt = 2,
        Shift = 4
    }
}
