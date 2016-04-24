using System;
using System.Text;
using System.Runtime.InteropServices;

namespace KeeWebHelper
{
    class WindowHelper
    {
        [DllImport("user32.dll")]
        static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

        public static WindowInfo GetActiveWindowInfo()
        {
            const int nChars = 2048;
            StringBuilder Buff = new StringBuilder(nChars);
            IntPtr handle = GetForegroundWindow();

            var result = new WindowInfo();
            if (GetWindowText(handle, Buff, nChars) > 0)
            {
                result.Title = Buff.ToString();
            }
            return result;
        }
    }
}
