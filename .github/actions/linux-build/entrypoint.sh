#!/bin/bash -e

cd /github/workspace
npm ci
grunt desktop-linux
