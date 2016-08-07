#import <Foundation/Foundation.h>

#import "InputCommandBase.h"

@interface SendTextCommand : NSObject<InputCommandBase> {
    NSString *text;
}

- (id)initWithText:(NSString *)aText;

@end
