import Foundation

struct ModifierKeys : OptionSetType {
    let rawValue: UInt8
    
    static let none = ModifierKeys(rawValue: 0)
    static let ctrl = ModifierKeys(rawValue: 1)
    static let alt = ModifierKeys(rawValue: 2)
    static let shift = ModifierKeys(rawValue: 4)
    static let cmd = ModifierKeys(rawValue: 8)
}
