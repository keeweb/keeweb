#import "SendTextCommand.h"
#import "../KeyRunner.h"

@implementation SendTextCommand

- (id)initWithText:(NSString *)aText {
    self = [super init];
    if (self) {
        text = aText;
    }
    return self;
}

- (void)execute {
    for (int i = 0; i < text.length; i++) {
        unichar ch = [text characterAtIndex:i];
        [KeyRunner keyPress:ch code:0 flags:0];
    }
}

@end
