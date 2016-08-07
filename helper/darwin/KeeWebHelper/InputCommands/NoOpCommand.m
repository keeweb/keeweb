#import "NoOpCommand.h"

@implementation NoOpCommand

- (id)init {
    self = [super init];
    return self;
}

- (id)initWithMessage:(NSString *)aMessage {
    self = [super init];
    if (self) {
        message = aMessage;
    }
    return self;
}

- (void)execute {
    if (message) {
        NSLog(@"Error: %@", message);
    }
}

@end
