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
    if (modifier) {
        [KeyRunner keyModUpDown:modifier down:true];
    }
    [KeyRunner keyPress:0 code:key flags:modifier];
    if (modifier) {
        [KeyRunner keyModUpDown:modifier down:false];
    }
}

@end
