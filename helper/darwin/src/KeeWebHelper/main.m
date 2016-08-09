#import <Foundation/Foundation.h>
#import <Quartz/Quartz.h>
#import <objc/objc-runtime.h>

#import "InputParser.h"

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSArray *arguments = [[NSProcessInfo processInfo] arguments];
        BOOL printTime = [arguments containsObject:@"--print-time"];
        CFTimeInterval startTime = CACurrentMediaTime();
        InputParser *parser = [[InputParser alloc] init];
        while (true) {
            id cmd = [parser next];
            if (cmd) {
                [cmd execute];
                if (printTime) {
                    int elapsed = (CACurrentMediaTime() - startTime) * 1000;
                    NSString *name = NSStringFromClass([cmd class]);
                    NSLog(@"%@: %dms", name, elapsed);
                }
            } else {
                break;
            }
        }
    }
    // TODO: ugly way to wait for all keystrokes to be sent. is there a better way?
    usleep(100000);
    return 0;
}
