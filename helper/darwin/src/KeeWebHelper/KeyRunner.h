#import <Foundation/Foundation.h>
#import <Cocoa/Cocoa.h>
#import <Carbon/Carbon.h>

@interface KeyRunner : NSObject

+ (void)initialize;
+ (void)keyPress:(unichar)ch code:(CGKeyCode)code flags:(CGEventFlags)flags;
+ (void)keyUpDown:(unichar)ch code:(CGKeyCode)code flags:(CGEventFlags)flags down:(bool)down;
+ (void)keyModUpDown:(CGEventFlags)flags down:(bool)down;
+ (void)validateSystemState;

@end
