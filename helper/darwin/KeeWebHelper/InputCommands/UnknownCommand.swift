import Foundation

class UnknownCommand : InputCommandBase {
    let name: String
    
    init(name: String) {
        self.name = name
    }
    
    func execute() {
        fputs("Unknown command: \(name)\n", stderr)
    }
}
