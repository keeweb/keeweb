#!/bin/bash
set -euxo pipefail

rm -rf package/osx/KeeWeb\ Installer.app

osacompile \
    -l JavaScript \
    -o package/osx/KeeWeb\ Installer.app \
    package/osx/installer/main.js

cp graphics/icon.icns package/osx/KeeWeb\ Installer.app/Contents/Resources/applet.icns
codesign --remove-signature package/osx/KeeWeb\ Installer.app

CS_ID=$(cat keys/codesign.json | jq -j '.identities.app')
codesign -s "$CS_ID" package/osx/KeeWeb\ Installer.app
