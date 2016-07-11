using System.Windows.Forms;

namespace KeeWebHelper.InputCommands
{
    class SendTextCommand : InputCommandBase
    {
        public string Text { get; set; }

        public SendTextCommand(string text)
        {
            Text = text;
        }

        public override void Execute()
        {
            SendKeys.SendWait(Text);
        }
    }
}
