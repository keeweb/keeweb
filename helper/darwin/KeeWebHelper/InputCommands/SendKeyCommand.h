#import <Foundation/Foundation.h>
#import <Cocoa/Cocoa.h>
#import <Carbon/Carbon.h>

#import "InputCommandBase.h"

@interface SendKeyCommand : NSObject<InputCommandBase> {
    CGKeyCode key;
    CGEventFlags modifier;
}

- (id)initWithKey:(CGKeyCode)aKey andModifier:(CGEventFlags)aModifier;

@end
