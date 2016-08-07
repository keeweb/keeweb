#import "UnknownCommand.h"

@implementation UnknownCommand

- (id)initWithName:(NSString *)aName {
    self = [super init];
    if (self) {
        name = aName;
    }
    return self;
}

- (void)execute {
    NSLog(@"Unknown command: %@", name);
}

@end
