#import <Foundation/Foundation.h>

#import "InputCommands/InputCommandBase.h"

@interface InputParser : NSObject

- (id<InputCommandBase>)next;

@end
