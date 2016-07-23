import Foundation

class SendTextCommand : InputCommandBase {
    let text: String
    
    init(text: String) {
        self.text = text
    }
    
    func execute() {
        for char in text.utf16 {
            KeyRunner.keyPress(char)
        }
    }
}
