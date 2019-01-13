using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace KeeWebHelper.InputCommands
{
    class SendKeyCommand : InputCommandBase
    {
        public byte Key { get; set; }
        public ModifierKeys Modifiers { get; set; }

        public SendKeyCommand(byte key, ModifierKeys modifiers)
        {
            Key = key;
            Modifiers = modifiers;
        }

        public override void Execute()
        {
            InputStateValidator.EnsureNoKeyIsPressed();
            if ((Modifiers & ModifierKeys.Ctrl) != 0) { Down((byte)Keys.ControlKey); }
            if ((Modifiers & ModifierKeys.Shift) != 0) { Down((byte)Keys.ShiftKey); }
            if ((Modifiers & ModifierKeys.Alt) != 0) { Down((byte)Keys.Menu); }
            Press(Key);
            if ((Modifiers & ModifierKeys.Alt) != 0) { Up((byte)Keys.Menu); }
            if ((Modifiers & ModifierKeys.Shift) != 0) { Up((byte)Keys.ShiftKey); }
            if ((Modifiers & ModifierKeys.Ctrl) != 0) { Up((byte)Keys.ControlKey); }
        }

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        public static void Down(byte code)
        {
            keybd_event(code, 0, 1, UIntPtr.Zero);
        }

        public static void Up(byte code)
        {
            keybd_event(code, 0, 3, UIntPtr.Zero);
        }

        public static void Press(byte code)
        {
            Down(code);
            Up(code);
        }
    }
}
