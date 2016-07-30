import Foundation
import Quartz

let printTime = Process.arguments.contains("--print-time")
let startTime = CACurrentMediaTime()

while true {
    let maybeCommand = InputParser.next()
    if let command = maybeCommand {
        command.execute()
        if (printTime) {
            let elapsed = Int((CACurrentMediaTime() - startTime) * 1000);
            let name = String(command.dynamicType)
            print("\(name): \(elapsed)ms")
        }
    } else {
        break
    }
    // ugly way to wait for all keystrokes to be sent. is there a better way?
    usleep(100);
}
