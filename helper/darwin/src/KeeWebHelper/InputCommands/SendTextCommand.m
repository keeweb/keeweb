#import "SendTextCommand.h"
#import "../KeyRunner.h"

@implementation SendTextCommand

NSDictionary *knownKeyCodes;

- (id)initWithText:(NSString *)aText andModifier:(CGEventFlags)aModifier {
    self = [super init];
    if (self) {
        text = aText;
        modifier = aModifier;
    }
    return self;
}

- (void)execute {
    if (modifier) {
        [KeyRunner keyModUpDown:modifier down:true];
    }
    NSString *textLower = [text lowercaseString];
    for (int i = 0; i < text.length; i++) {
        unichar ch = [text characterAtIndex:i];
        unichar chLower = [textLower characterAtIndex:i];
        id knownKeyCode = [knownKeyCodes objectForKey:@(chLower)];
        CGKeyCode keyCode = knownKeyCode == nil ? 0 : (CGKeyCode)[knownKeyCode unsignedShortValue];
        if (modifier && modifier != kCGEventFlagMaskShift) {
            ch = 0;
        }
        [KeyRunner keyPress:ch code:keyCode flags:modifier];
    }
    if (modifier) {
        [KeyRunner keyModUpDown:modifier down:false];
    }
}

+ (void)initialize {
    knownKeyCodes = @{
        @'0': @(kVK_ANSI_0),
        @'1': @(kVK_ANSI_1),
        @'2': @(kVK_ANSI_2),
        @'3': @(kVK_ANSI_3),
        @'4': @(kVK_ANSI_4),
        @'5': @(kVK_ANSI_5),
        @'6': @(kVK_ANSI_6),
        @'7': @(kVK_ANSI_7),
        @'8': @(kVK_ANSI_8),
        @'9': @(kVK_ANSI_9),
        @'0': @(kVK_ANSI_0),
        @'a': @(kVK_ANSI_A),
        @'b': @(kVK_ANSI_B),
        @'c': @(kVK_ANSI_C),
        @'d': @(kVK_ANSI_D),
        @'e': @(kVK_ANSI_E),
        @'f': @(kVK_ANSI_F),
        @'g': @(kVK_ANSI_G),
        @'h': @(kVK_ANSI_H),
        @'i': @(kVK_ANSI_I),
        @'j': @(kVK_ANSI_J),
        @'k': @(kVK_ANSI_K),
        @'l': @(kVK_ANSI_L),
        @'m': @(kVK_ANSI_M),
        @'n': @(kVK_ANSI_N),
        @'o': @(kVK_ANSI_O),
        @'p': @(kVK_ANSI_P),
        @'q': @(kVK_ANSI_Q),
        @'r': @(kVK_ANSI_R),
        @'s': @(kVK_ANSI_S),
        @'t': @(kVK_ANSI_T),
        @'u': @(kVK_ANSI_U),
        @'v': @(kVK_ANSI_V),
        @'w': @(kVK_ANSI_W),
        @'x': @(kVK_ANSI_X),
        @'y': @(kVK_ANSI_Y),
        @'z': @(kVK_ANSI_Z),
        @'!': @(kVK_ANSI_1),
        @'@': @(kVK_ANSI_2),
        @'#': @(kVK_ANSI_3),
        @'$': @(kVK_ANSI_4),
        @'%': @(kVK_ANSI_5),
        @'^': @(kVK_ANSI_6),
        @'&': @(kVK_ANSI_7),
        @'*': @(kVK_ANSI_8),
        @'(': @(kVK_ANSI_9),
        @')': @(kVK_ANSI_0),
        @'-': @(kVK_ANSI_Minus),
        @'_': @(kVK_ANSI_Minus),
        @'=': @(kVK_ANSI_Equal),
        @'+': @(kVK_ANSI_Equal),
        @'`': @(kVK_ANSI_Grave),
        @'~': @(kVK_ANSI_Grave),
        @',': @(kVK_ANSI_Comma),
        @'<': @(kVK_ANSI_Comma),
        @'.': @(kVK_ANSI_Period),
        @'>': @(kVK_ANSI_Period),
        @'/': @(kVK_ANSI_Slash),
        @'?': @(kVK_ANSI_Slash),
        @'\\': @(kVK_ANSI_Backslash),
        @'|': @(kVK_ANSI_Backslash),
        @';': @(kVK_ANSI_Semicolon),
        @':': @(kVK_ANSI_Semicolon),
        @'\'': @(kVK_ANSI_Quote),
        @'"': @(kVK_ANSI_Quote),
        @'[': @(kVK_ANSI_LeftBracket),
        @'{': @(kVK_ANSI_LeftBracket),
        @']': @(kVK_ANSI_RightBracket),
        @'}': @(kVK_ANSI_RightBracket),
        @'\t': @(kVK_Tab)
    };
}

@end
