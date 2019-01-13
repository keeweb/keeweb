namespace WindowsInput.Native
{
    /// <summary>
    /// Specifies the type of the input event. This member can be one of the following values. 
    /// </summary>
    internal enum InputType : uint // UInt32
    {
        /// <summary>
        /// INPUT_MOUSE = 0x00 (The event is a mouse event. Use the mi structure of the union.)
        /// </summary>
        Mouse = 0,

        /// <summary>
        /// INPUT_KEYBOARD = 0x01 (The event is a keyboard event. Use the ki structure of the union.)
        /// </summary>
        Keyboard = 1,

        /// <summary>
        /// INPUT_HARDWARE = 0x02 (Windows 95/98/Me: The event is from input hardware other than a keyboard or mouse. Use the hi structure of the union.)
        /// </summary>
        Hardware = 2,
    }
}
