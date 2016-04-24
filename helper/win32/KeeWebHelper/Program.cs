using System;
using System.Text;

namespace KeeWebHelper
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Console.InputEncoding = Encoding.UTF8;
            Console.OutputEncoding = Encoding.UTF8;
            if (args.Length > 0 && args[0] == "--window-info")
            {
                GetWindowInfo();
                return;
            }
            var printTime = args.Length > 0 && args[0] == "--print-time";
            var sw = System.Diagnostics.Stopwatch.StartNew();
            Console.WriteLine("Start: " + sw.ElapsedMilliseconds);
            while (true)
            {
                var cmd = InputParser.Next();
                if (cmd == null)
                {
                    return;
                }
                cmd.Execute();
                if (printTime)
                {
                    Console.WriteLine("{0}: {1}ms", cmd.GetType().Name, sw.ElapsedMilliseconds);
                }
            }
        }

        static void GetWindowInfo()
        {
            var windowInfo = WindowHelper.GetActiveWindowInfo();
            Console.WriteLine(windowInfo.Title);
            Console.WriteLine(windowInfo.Url);
        }
    }
}
