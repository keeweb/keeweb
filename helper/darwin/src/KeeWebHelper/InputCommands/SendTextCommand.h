#import <Foundation/Foundation.h>

#import "InputCommandBase.h"

@interface SendTextCommand : NSObject<InputCommandBase> {
    NSString *text;
    CGEventFlags modifier;
}

- (id)initWithText:(NSString *)aText andModifier:(CGEventFlags)aModifier;
+ (void)initialize;

@end
