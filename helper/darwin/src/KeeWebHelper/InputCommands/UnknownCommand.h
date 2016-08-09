#import <Foundation/Foundation.h>

#import "InputCommandBase.h"

@interface UnknownCommand : NSObject<InputCommandBase> {
    NSString *name;
}

- (id)initWithName:(NSString *)aName;

@end
