#import <Foundation/Foundation.h>
#import <Cocoa/Cocoa.h>
#import <Carbon/Carbon.h>

@interface KeyRunner : NSObject

+ (void)keyPress:(unichar)ch code:(CGKeyCode)code flags:(CGEventFlags)flags;
+ (void)keyUpDown:(unichar)ch code:(CGKeyCode)code flags:(CGEventFlags)flags down:(bool)down;

@end
