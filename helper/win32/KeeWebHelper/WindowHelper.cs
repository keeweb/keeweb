using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Windows.Automation;

namespace KeeWebHelper
{
    class WindowHelper
    {
        [DllImport("user32.dll")]
        static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

        [DllImport("user32.dll", SetLastError = true)]
        static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

        public static WindowInfo GetActiveWindowInfo()
        {
            const int nChars = 2048;
            StringBuilder Buff = new StringBuilder(nChars);
            IntPtr hwnd = GetForegroundWindow();

            var result = new WindowInfo();
            if (GetWindowText(hwnd, Buff, nChars) > 0)
            {
                result.Title = Buff.ToString();
            }

            try
            {
                result.Url = GetUrl(hwnd);
            }
            catch { }

            return result;
        }

        static string GetUrl(IntPtr hwnd)
        {
            uint pid = 0;
            GetWindowThreadProcessId(hwnd, out pid);
            if (pid <= 0)
            {
                return null;
            }
            var process = Process.GetProcessById((int)pid);
            return GetUrlAcc(process);
        }

        static string GetUrlAcc(Process process)
        {
            var el = AutomationElement.FromHandle(process.MainWindowHandle);
            if (el == null)
            {
                return null;
            }

            if (process.ProcessName.IndexOf("chrome", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                var elChr = el.FindFirst(TreeScope.Children, new PropertyCondition(AutomationElement.NameProperty, "Google Chrome"));
                if (elChr != null)
                {
                    el = elChr;
                }
            }

            var controlCondition = new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit);
            var valueCondition = new PropertyCondition(AutomationElement.IsValuePatternAvailableProperty, true);
            var condition = new AndCondition(controlCondition, valueCondition);
            AutomationElement urlEl = el.FindFirst(TreeScope.Descendants, condition);
            if (urlEl == null)
            {
                return null;
            }

            var val = (ValuePattern)urlEl.GetCurrentPattern(ValuePattern.Pattern);
            return val.Current.Value;
        }
    }
}
