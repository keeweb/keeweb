using System;

namespace KeeWebHelper.InputCommands
{
    class UnknownCommand : InputCommandBase
    {
        public string Name { get; set; }

        public UnknownCommand(string name)
        {
            Name = name;
        }

        public override void Execute()
        {
            Console.Error.WriteLine("Unknown command: {0}", Name);
        }
    }
}
