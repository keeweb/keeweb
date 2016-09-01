#import <Foundation/Foundation.h>

#import "InputCommandBase.h"

@interface NoOpCommand : NSObject<InputCommandBase> {
    NSString *message;
}

- (id)init;
- (id)initWithMessage:(NSString *)aMessage;

@end
