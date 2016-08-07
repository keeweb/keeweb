#import "WaitCommand.h"

@implementation WaitCommand

- (id)initWithTime:(NSInteger)aTime {
    self = [super init];
    if (self) {
        time = aTime;
    }
    return self;
}

- (void)execute {
    usleep((unsigned)(time * 1000));
}

@end
