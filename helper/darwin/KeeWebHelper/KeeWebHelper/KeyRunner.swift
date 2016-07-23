import Foundation

class KeyRunner {
    static let inputSource = CGEventSourceCreate(CGEventSourceStateID.HIDSystemState)

    class func keyPress(char: UniChar?,
                        code: CGKeyCode = 0,
                        flags: CGEventFlags? = nil) {
        keyUpDown(char, code: code, flags: flags, down: true)
        keyUpDown(char, code: code, flags: flags, down: false)
    }
    
    class func keyUpDown(char: UniChar?,
                         code: CGKeyCode,
                         flags: CGEventFlags?,
                         down: Bool) {
        let keyEvent = CGEventCreateKeyboardEvent(KeyRunner.inputSource, code, down)
        if (char != nil) {
            var ch = char!;
            CGEventKeyboardSetUnicodeString(keyEvent, 1, &ch)
        }
        if (flags != nil) {
            CGEventSetFlags(keyEvent, flags!)
        }
        CGEventPost(CGEventTapLocation.CGHIDEventTap, keyEvent)
    }
}
