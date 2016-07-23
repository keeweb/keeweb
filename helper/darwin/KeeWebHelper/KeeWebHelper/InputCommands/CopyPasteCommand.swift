import Foundation
import Cocoa
import Carbon

class CopyPasteCommand : InputCommandBase {
    let text: String
    
    init(text: String) {
        self.text = text
    }
    
    func execute() {
        usleep(500_000)
        let pasteboard = NSPasteboard.generalPasteboard();
        pasteboard.clearContents()
        pasteboard.setString(text, forType: NSStringPboardType)
        usleep(500_000)
        KeyRunner.keyUpDown(nil, code: CGKeyCode(kVK_Command), flags: nil, down: true)
        KeyRunner.keyPress(nil, code: CGKeyCode(kVK_ANSI_V), flags: CGEventFlags.MaskCommand)
        KeyRunner.keyUpDown(nil, code: CGKeyCode(kVK_Command), flags: nil, down: false)
        usleep(500_000)
    }
}
