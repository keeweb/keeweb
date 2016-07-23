import Foundation

let src = CGEventSourceCreate(CGEventSourceStateID.HIDSystemState)

func pressChar(char: UniChar) {
    pressCharUpDown(char, down: true)
    pressCharUpDown(char, down: false)
}

func pressCharUpDown(char: UniChar, down: Bool) {
    var ch = char;
    let keyEvent = CGEventCreateKeyboardEvent(src, 0, down)
    CGEventKeyboardSetUnicodeString(keyEvent, 1, &ch)
    CGEventPost(CGEventTapLocation.CGHIDEventTap, keyEvent)
}

for char in "\n^A~A´A¼Î©~{*!+¢f4ыâ\n".utf16 {
    pressChar(char)
}
