#import <Foundation/Foundation.h>
#import <readline/readline.h>

#import "InputParser.h"
#import "InputCommands/CopyPasteCommand.h"
#import "InputCommands/NoOpCommand.h"
#import "InputCommands/SendKeyCommand.h"
#import "InputCommands/SendTextCommand.h"
#import "InputCommands/UnknownCommand.h"
#import "InputCommands/WaitCommand.h"

@implementation InputParser

- (id<InputCommandBase>)next {
    const char *chars = readline(NULL);
    if (chars) {
        NSString *line = [NSString stringWithUTF8String:chars];
        NSString *command = line;
        NSRange range = [line rangeOfString:@" "];
        if (range.location != NSNotFound) {
            command = [line substringToIndex:range.location];
            line = [line substringFromIndex:range.location + 1];
        }
        if (!command.length) {
            return [[NoOpCommand alloc] init];
        }
        if ([command isEqualToString:@"exit"]) {
            return nil;
        } else if ([command isEqualToString:@"key"]) {
            return [self parseSendKeyCommand:line];
        } else if ([command isEqualToString:@"text"]) {
            if (line.length) {
                return [[SendTextCommand alloc] initWithText:line];
            } else {
                return [[NoOpCommand alloc] init];
            }
        } else if ([command isEqualToString:@"copypaste"]) {
            if (line.length) {
                return [[CopyPasteCommand alloc] initWithText:line];
            } else {
                return [[NoOpCommand alloc] init];
            }
        } else if ([command isEqualToString:@"wait"]) {
            NSInteger time = [line integerValue];
            if (time > 0) {
                return [[WaitCommand alloc] initWithTime:time];
            } else {
                return [[NoOpCommand alloc] initWithMessage:@"Bad time"];
            }
        }
        return [[UnknownCommand alloc] initWithName:command];
    } else {
        return nil;
    }
}

- (id<InputCommandBase>)parseSendKeyCommand:(NSString*)args {
    if (!args.length) {
        return [[NoOpCommand alloc] init];
    }
    CGEventFlags modifier = 0;
    NSCharacterSet *digitChars = [NSCharacterSet decimalDigitCharacterSet];
    NSInteger index = 0;
    while (args.length) {
        unichar firstChar = [args characterAtIndex:index];
        if ([digitChars characterIsMember:firstChar]) {
            break;
        }
        switch (firstChar) {
            case '^':
                modifier |= kCGEventFlagMaskControl;
                break;
            case '+':
                modifier |= kCGEventFlagMaskShift;
                break;
            case '%':
                modifier |= kCGEventFlagMaskAlternate;
                break;
            case '@':
                modifier |= kCGEventFlagMaskCommand;
                break;
            default:
                return [[NoOpCommand alloc] initWithMessage:@"Bad key modifier"];
        }
        index++;
    }
    if (index > 0) {
        if (index == args.length) {
            return [[NoOpCommand alloc] initWithMessage:@"No key code"];
        }
        args = [args substringFromIndex:index];
    }
    NSInteger key = [args integerValue];
    if (key <= 0) {
        return [[NoOpCommand alloc] initWithMessage:@"Bad key code"];
    }
    return [[SendKeyCommand alloc] initWithKey:(CGKeyCode)key andModifier:modifier];
}

@end
