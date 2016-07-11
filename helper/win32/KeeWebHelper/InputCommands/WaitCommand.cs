using System.Threading;

namespace KeeWebHelper.InputCommands
{
    class WaitCommand : InputCommandBase
    {
        public int Interval { get; set; }

        public WaitCommand(int interval)
        {
            Interval = interval;
        }

        public override void Execute()
        {
            Thread.Sleep(Interval);
        }
    }
}
