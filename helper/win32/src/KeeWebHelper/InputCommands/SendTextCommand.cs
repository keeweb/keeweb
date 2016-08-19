namespace KeeWebHelper.InputCommands
{
    class SendTextCommand : InputCommandBase
    {
        private static WindowsInput.IKeyboardSimulator _simulator = new WindowsInput.InputSimulator().Keyboard;

        public string Text { get; set; }
        public ModifierKeys Modifiers { get; set; }

        public SendTextCommand(string text, ModifierKeys modifiers)
        {
            Text = text;
            Modifiers = modifiers;
        }

        public override void Execute()
        {
            InputStateValidator.EnsureNoKeyIsPressed();
            if ((Modifiers & ModifierKeys.Ctrl) != 0) { _simulator.KeyDown(WindowsInput.Native.VirtualKeyCode.CONTROL); }
            if ((Modifiers & ModifierKeys.Shift) != 0) { _simulator.KeyDown(WindowsInput.Native.VirtualKeyCode.SHIFT); }
            if ((Modifiers & ModifierKeys.Alt) != 0) { _simulator.KeyDown(WindowsInput.Native.VirtualKeyCode.MENU); }
            _simulator.TextEntry(Text);
            if ((Modifiers & ModifierKeys.Ctrl) != 0) { _simulator.KeyUp(WindowsInput.Native.VirtualKeyCode.CONTROL); }
            if ((Modifiers & ModifierKeys.Shift) != 0) { _simulator.KeyUp(WindowsInput.Native.VirtualKeyCode.SHIFT); }
            if ((Modifiers & ModifierKeys.Alt) != 0) { _simulator.KeyUp(WindowsInput.Native.VirtualKeyCode.MENU); }
        }
    }
}
