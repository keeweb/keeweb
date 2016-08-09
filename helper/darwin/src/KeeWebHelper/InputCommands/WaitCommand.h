#import <Foundation/Foundation.h>

#import "InputCommandBase.h"

@interface WaitCommand : NSObject<InputCommandBase> {
    NSInteger time;
}

- (id)initWithTime:(NSInteger)aTime;

@end
