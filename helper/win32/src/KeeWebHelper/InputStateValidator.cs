using System;
using System.Linq;

namespace KeeWebHelper
{
    static class InputStateValidator
    {
        const int MaxWaitTime = 1000 * 10;
        const int LoopWaitTime = 100;

        static readonly WindowsInput.Native.VirtualKeyCode[] SupportedKeys = new [] {
            WindowsInput.Native.VirtualKeyCode.SHIFT,
            WindowsInput.Native.VirtualKeyCode.MENU,
            WindowsInput.Native.VirtualKeyCode.CONTROL,
            WindowsInput.Native.VirtualKeyCode.LWIN,
            WindowsInput.Native.VirtualKeyCode.RWIN
        };

        static bool _isValid = false;

        public static void EnsureNoKeyIsPressed()
        {
            if (_isValid)
            {
                return;
            }
            var waitTime = MaxWaitTime;
            var adapter = new WindowsInput.WindowsInputDeviceStateAdaptor();
            while (waitTime > 0)
            {
                var isPressed = SupportedKeys.Any(key => adapter.IsHardwareKeyDown(key));
                if (isPressed)
                {
                    waitTime -= LoopWaitTime;
                    System.Threading.Thread.Sleep(LoopWaitTime);
                }
                else
                {
                    _isValid = true;
                    break;
                }
            }
            if (!_isValid)
            {
                throw new Exception("Failed to wait for modifier keys unpress");
            }
        }
    }
}
