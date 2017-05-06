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
                    return ParseSendCommand(parts[1], false);
                case "text":
                    return ParseSendCommand(parts[1], true);
                case "copypaste":
                    return new CopyPasteCommand(parts[1]);
                case "wait":
                    return new WaitCommand(int.Parse(parts[1]));
                default:
                    return new UnknownCommand(parts[0]);
            }
        }

        static InputCommandBase ParseSendCommand(string arg, bool text)
        {
            ModifierKeys modifiers = ModifierKeys.None;
            var index = 0;
            while (index < arg.Length && !Char.IsDigit(arg[index]) && !Char.IsWhiteSpace(arg[index]))
            {
                switch (arg[index])
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
                index++;
            }
            if (text)
            {
                index++;
            }
            if (index >= arg.Length)
            {
                return new NoOpCommand();
            }
            if (text)
            {
                return new SendTextCommand(arg.Substring(index), modifiers);
            }
            else
            {
                var key = byte.Parse(arg.Substring(index));
                return new SendKeyCommand(key, modifiers);
            }
        }
    }
}
