#import "SendKeyCommand.h"
#import "../KeyRunner.h"

@implementation SendKeyCommand

- (id)initWithKey:(CGKeyCode)aKey andModifier:(CGEventFlags)aModifier {
    self = [super init];
    if (self) {
        key = aKey;
        modifier = aModifier;
    }
    return self;
}

- (void)execute {
    if (modifier & kCGEventFlagMaskCommand) {
        [KeyRunner keyUpDown:0 code:kVK_Command flags:0 down:true];
    }
    if (modifier & kCGEventFlagMaskAlternate) {
        [KeyRunner keyUpDown:0 code:kVK_Option flags:0 down:true];
    }
    if (modifier & kCGEventFlagMaskControl) {
        [KeyRunner keyUpDown:0 code:kVK_Control flags:0 down:true];
    }
    if (modifier & kCGEventFlagMaskShift) {
        [KeyRunner keyUpDown:0 code:kVK_Shift flags:0 down:true];
    }
    [KeyRunner keyPress:0 code:key flags:modifier];
    if (modifier & kCGEventFlagMaskCommand) {
        [KeyRunner keyUpDown:0 code:kVK_Command flags:0 down:false];
    }
    if (modifier & kCGEventFlagMaskAlternate) {
        [KeyRunner keyUpDown:0 code:kVK_Option flags:0 down:false];
    }
    if (modifier & kCGEventFlagMaskControl) {
        [KeyRunner keyUpDown:0 code:kVK_Control flags:0 down:false];
    }
    if (modifier & kCGEventFlagMaskShift) {
        [KeyRunner keyUpDown:0 code:kVK_Shift flags:0 down:false];
    }
}

@end
