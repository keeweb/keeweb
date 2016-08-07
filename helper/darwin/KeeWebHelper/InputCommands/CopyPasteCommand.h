#import <Foundation/Foundation.h>

#import "InputCommandBase.h"

@interface CopyPasteCommand : NSObject<InputCommandBase> {
    NSString *text;
}

- (id)initWithText:(NSString *)aText;

@end
