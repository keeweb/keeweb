using System;
using KeeWebHelper.InputCommands;

namespace KeeWebHelper
{
    class InputParser
    {
        public static InputCommandBase Next()
        {
            var line = Console.ReadLine();
            if (line == null)
            {
                return null;
            }
            line = line.Trim();
            if (line.Length == 0)
            {
                return new NoOpCommand();
            }
            var parts = line.Split(new[] { ' ' }, 2);
            switch (parts[0])
            {
                case "exit":
                    return null;
                case "key":
                    return ParseSendKeyCommand(parts[1]);
                case "text":
                    return new SendTextCommand(parts[1]);
                case "copypaste":
                    return new CopyPasteCommand(parts[1]);
                case "wait":
                    return new WaitCommand(int.Parse(parts[1]));
                default:
                    return new UnknownCommand(parts[0]);
            }
        }

        static InputCommandBase ParseSendKeyCommand(string arg)
        {
            ModifierKeys modifiers = ModifierKeys.None;
            while (arg[0] < '0' || arg[0] > '9')
            {
                switch (arg[0])
                {
                    case '^':
                        modifiers |= ModifierKeys.Ctrl;
                        break;
                    case '+':
                        modifiers |= ModifierKeys.Shift;
                        break;
                    case '%':
                        modifiers |= ModifierKeys.Alt;
                        break;
                }
                arg = arg.Substring(1);
            }
            var key = byte.Parse(arg);
            return new SendKeyCommand(key, modifiers);
        }
    }
}
