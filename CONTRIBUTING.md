# Contributing to KeeWeb

:+1: Thanks for taking the time to contribute! :gift:

## Issues

If you have found an bug, please [open an issue](https://github.com/antelle/keeweb/issues/new) and fill in the app version and your user-agent 
(you can find these details in Settings/Help section). Please check [FAQ](https://github.com/antelle/keeweb/wiki/FAQ) before submitting a new issue 
and [TODO](https://github.com/antelle/keeweb/wiki/TODO) before creating a feature request.

Please, describe the issue in details: what were your actions? What has happened? 
Does it happen on Demo or New database? If no, how to reproduce this? If you are using a test db without your personal data, please attach it.

## Pull Requests

Plugins are not supported for now. So, if you want to add a feature, please, follow these steps:

1. make sure it's not listed in [banned features](https://github.com/antelle/keeweb/wiki/Unsupported-Features)
2. check compatibility with [the project roadmap](https://github.com/antelle/keeweb/wiki/TODO) and key features: you should not break anything
3. if your feature is introducing a lot of new UI, or is changing any UX or design concept, please, open an issue to discuss it first
4. please, respect existing style in code, styles and markup (hint: install and enable [editorconfig](http://editorconfig.org/) in your editor)
5. don't add any dependencies
6. test your code: it must work in browser, Windows, OSX and Linux
7. if your code is platform-dependent, please add corresponding switches
8. respect each platform: don't create behaviour which breaks interface guidelines or user expectations 
9. run `grunt` and make sure it's passing 
