import Foundation
import Cocoa
import Carbon

class SendKeyCommand : InputCommandBase {
    let key: UInt16
    let modifiers: ModifierKeys
    
    init(key: UInt16, modifiers: ModifierKeys) {
        self.key = key
        self.modifiers = modifiers
    }
    
    func execute() {
        var rawFlags: UInt64 = 0
        
        if modifiers.contains(ModifierKeys.cmd) {
            KeyRunner.keyUpDown(nil, code: CGKeyCode(kVK_Command), flags: nil, down: true)
            rawFlags += CGEventFlags.MaskCommand.rawValue
        }
        if modifiers.contains(ModifierKeys.alt) {
            KeyRunner.keyUpDown(nil, code: CGKeyCode(kVK_Option), flags: nil, down: true)
            rawFlags += CGEventFlags.MaskAlternate.rawValue
        }
        if modifiers.contains(ModifierKeys.ctrl) {
            KeyRunner.keyUpDown(nil, code: CGKeyCode(kVK_Control), flags: nil, down: true)
            rawFlags += CGEventFlags.MaskControl.rawValue
        }
        if modifiers.contains(ModifierKeys.shift) {
            KeyRunner.keyUpDown(nil, code: CGKeyCode(kVK_Shift), flags: nil, down: true)
            rawFlags += CGEventFlags.MaskShift.rawValue
        }
        
        let flags: CGEventFlags? = rawFlags == 0 ? nil : CGEventFlags(rawValue: rawFlags)
        KeyRunner.keyPress(nil, code: key, flags: flags)
        
        if modifiers.contains(ModifierKeys.shift) {
            KeyRunner.keyUpDown(nil, code: CGKeyCode(kVK_Shift), flags: nil, down: false)
        }
        if modifiers.contains(ModifierKeys.ctrl) {
            KeyRunner.keyUpDown(nil, code: CGKeyCode(kVK_Control), flags: nil, down: false)
        }
        if modifiers.contains(ModifierKeys.alt) {
            KeyRunner.keyUpDown(nil, code: CGKeyCode(kVK_Option), flags: nil, down: false)
        }
        if modifiers.contains(ModifierKeys.cmd) {
            KeyRunner.keyUpDown(nil, code: CGKeyCode(kVK_Command), flags: nil, down: false)
        }
    }
}
