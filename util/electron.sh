electron-packager electron/ KeeWeb --platform=darwin --arch=x64 --version=0.34.0 --icon=graphics/app.icns
electron-builder KeeWeb-darwin-x64/KeeWeb.app --platform=osx --out=. --config=./util/electron-builder.json
#electron-installer-dmg ./KeeWeb-darwin-x64/KeeWeb.app KeeWeb --out=./ --background=./graphics/dmg-bg.png  --icon=./graphics/app.icns --overwrite
rm -rf ./KeeWeb-darwin-x64/

electron-packager electron/ KeeWeb --platform=linux --arch=x64 --version=0.34.0 --icon=graphics/app.ico
zip -r ./KeeWeb.linux.x64.zip ./KeeWeb-linux-x64/
rm -rf ./KeeWeb-linux-x64/

electron-packager electron/ KeeWeb --platform=win32 --arch=ia32 --version=0.34.0 --icon=graphics/app.ico
electron-builder KeeWeb-win32-ia32 --platform=win --out=. --config=./util/electron-builder.json
rm -rf ./KeeWeb-win32-ia32/
