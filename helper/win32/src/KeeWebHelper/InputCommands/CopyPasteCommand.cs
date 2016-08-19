using System.Threading;
using System.Windows.Forms;

namespace KeeWebHelper.InputCommands
{
    class CopyPasteCommand : InputCommandBase
    {
        public string Text { get; set; }

        public CopyPasteCommand(string text)
        {
            Text = text;
        }

        public override void Execute()
        {
            InputStateValidator.EnsureNoKeyIsPressed();
            Thread.Sleep(500);
            Clipboard.SetText(Text);
            Thread.Sleep(500);
            SendKeys.SendWait("+{ins}");
            Thread.Sleep(500);
        }
    }
}
