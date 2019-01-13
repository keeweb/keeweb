using System;

namespace WindowsInput.Native
{
#pragma warning disable 649
    /// <summary>
    /// The KEYBDINPUT structure contains information about a simulated keyboard event.  (see: http://msdn.microsoft.com/en-us/library/ms646271(VS.85).aspx)
    /// Declared in Winuser.h, include Windows.h
    /// </summary>
    /// <remarks>
    /// Windows 2000/XP: INPUT_KEYBOARD supports nonkeyboard-input methodssuch as handwriting recognition or voice recognitionas if it were text input by using the KEYEVENTF_UNICODE flag. If KEYEVENTF_UNICODE is specified, SendInput sends a WM_KEYDOWN or WM_KEYUP message to the foreground thread's message queue with wParam equal to VK_PACKET. Once GetMessage or PeekMessage obtains this message, passing the message to TranslateMessage posts a WM_CHAR message with the Unicode character originally specified by wScan. This Unicode character will automatically be converted to the appropriate ANSI value if it is posted to an ANSI window.
    /// Windows 2000/XP: Set the KEYEVENTF_SCANCODE flag to define keyboard input in terms of the scan code. This is useful to simulate a physical keystroke regardless of which keyboard is currently being used. The virtual key value of a key may alter depending on the current keyboard layout or what other keys were pressed, but the scan code will always be the same.
    /// </remarks>
    internal struct KEYBDINPUT
    {
        /// <summary>
        /// Specifies a virtual-key code. The code must be a value in the range 1 to 254. The Winuser.h header file provides macro definitions (VK_*) for each value. If the dwFlags member specifies KEYEVENTF_UNICODE, wVk must be 0. 
        /// </summary>
        public UInt16 KeyCode;

        /// <summary>
        /// Specifies a hardware scan code for the key. If dwFlags specifies KEYEVENTF_UNICODE, wScan specifies a Unicode character which is to be sent to the foreground application. 
        /// </summary>
        public UInt16 Scan;

        /// <summary>
        /// Specifies various aspects of a keystroke. This member can be certain combinations of the following values.
        /// KEYEVENTF_EXTENDEDKEY - If specified, the scan code was preceded by a prefix byte that has the value 0xE0 (224).
        /// KEYEVENTF_KEYUP - If specified, the key is being released. If not specified, the key is being pressed.
        /// KEYEVENTF_SCANCODE - If specified, wScan identifies the key and wVk is ignored. 
        /// KEYEVENTF_UNICODE - Windows 2000/XP: If specified, the system synthesizes a VK_PACKET keystroke. The wVk parameter must be zero. This flag can only be combined with the KEYEVENTF_KEYUP flag. For more information, see the Remarks section. 
        /// </summary>
        public UInt32 Flags;

        /// <summary>
        /// Time stamp for the event, in milliseconds. If this parameter is zero, the system will provide its own time stamp. 
        /// </summary>
        public UInt32 Time;

        /// <summary>
        /// Specifies an additional value associated with the keystroke. Use the GetMessageExtraInfo function to obtain this information. 
        /// </summary>
        public IntPtr ExtraInfo;
    }
#pragma warning restore 649
}
