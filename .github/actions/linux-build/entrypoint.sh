#!/bin/bash -e

cd /github/workspace
npm ci
cd desktop
npm ci
cd /github/workspace
grunt desktop-linux
