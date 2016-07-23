import Foundation

class WaitCommand : InputCommandBase {
    let interval: UInt32
    
    init(interval: UInt32) {
        self.interval = interval
    }
    
    func execute() {
        usleep(interval * 1_000)
    }
}
