#import "KeyRunner.h"

@implementation KeyRunner

CGEventSourceRef eventSource = nil;

+ (void)initialize {
    eventSource = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
}

+ (void)keyPress:(unichar)ch code:(CGKeyCode)code flags:(CGEventFlags)flags {
    [self keyUpDown:ch code:code flags:flags down:true];
    [self keyUpDown:ch code:code flags:flags down:false];
}

+ (void)keyModUpDown:(CGEventFlags)modifier down:(bool)down {
    if (modifier & kCGEventFlagMaskCommand) {
        [self keyUpDown:0 code:kVK_Command flags:0 down:down];
    }
    if (modifier & kCGEventFlagMaskAlternate) {
        [self keyUpDown:0 code:kVK_Option flags:0 down:down];
    }
    if (modifier & kCGEventFlagMaskControl) {
        [self keyUpDown:0 code:kVK_Control flags:0 down:down];
    }
    if (modifier & kCGEventFlagMaskShift) {
        [self keyUpDown:0 code:kVK_Shift flags:0 down:down];
    }
}

+ (void)keyUpDown:(unichar)ch code:(CGKeyCode)code flags:(CGEventFlags)flags down:(bool)down {
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
