#import "KeyRunner.h"

@implementation KeyRunner

CGEventSourceRef eventSource = nil;
bool keyboardStateIsValid = false;

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
    [KeyRunner validateSystemState];
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

+ (void)validateSystemState {
    if (keyboardStateIsValid) {
        return;
    }
    int totalWaitTime = 10 * 1000 * 1000;
    int loopWaitTime = 10000;
    while (totalWaitTime > 0) {
        CGEventFlags flags = CGEventSourceFlagsState(kCGEventSourceStateHIDSystemState);
        if ((flags & (kCGEventFlagMaskCommand | kCGEventFlagMaskShift | kCGEventFlagMaskAlternate | kCGEventFlagMaskControl)) == 0) {
            keyboardStateIsValid = true;
            break;
        }
        usleep(loopWaitTime);
        totalWaitTime -= loopWaitTime;
    }
    if (!keyboardStateIsValid) {
        exit(8);
    }
}

@end
