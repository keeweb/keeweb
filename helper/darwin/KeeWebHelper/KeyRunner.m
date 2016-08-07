#import "KeyRunner.h"

@implementation KeyRunner

CGEventSourceRef eventSource = nil;

+ (void)keyPress:(unichar)ch code:(CGKeyCode)code flags:(CGEventFlags)flags {
    [self keyUpDown:ch code:code flags:flags down:false];
    [self keyUpDown:ch code:code flags:flags down:true];
}

+ (void)keyUpDown:(unichar)ch code:(CGKeyCode)code flags:(CGEventFlags)flags down:(bool)down {
    if (!eventSource) {
        eventSource = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
    }
    CGEventRef keyEvent = CGEventCreateKeyboardEvent(eventSource, code, down);
    if (ch) {
        CGEventKeyboardSetUnicodeString(keyEvent, 1, &ch);
    }
    if (flags) {
        CGEventSetFlags(keyEvent, flags);
    }
    CGEventPost(kCGHIDEventTap, keyEvent);
    CFRelease(keyEvent);
}

@end
