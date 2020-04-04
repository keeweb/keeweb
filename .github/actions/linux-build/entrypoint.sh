#!/bin/bash -e

cd /github/workspace/keeweb
npm ci
grunt desktop-linux
