#!/usr/bin/env bash
mkdir -p ../../tmp/build/dockerWebDav
cp ./* ../../tmp/build/dockerWebDav
cp -u ../../app/resources/Demo.kdbx ../../tmp/build/dockerWebDav/Demo.kdbx
cp -r dist ../../tmp/build/dockerWebDav/
cd ../../tmp/build/dockerWebDav

docker build -t keeweb:dev .

# docker run --name keeweb -d -p 443:443 -p 80:80 -e 'DH_SIZE=512' -e 'WEBDAV_USERNAME=admin' -e 'WEBDAV_USERNAME=changme' keeweb:dev
