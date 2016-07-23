import Foundation

class SendKeyCommand : InputCommandBase {
    let key: UInt16
    let modifiers: ModifierKeys
    
    init(key: UInt16, modifiers: ModifierKeys) {
        self.key = key
        self.modifiers = modifiers
    }
    
    func execute() {
        KeyRunner.keyPress(nil, code: key)
    }
}
