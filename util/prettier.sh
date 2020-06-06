#!/bin/sh

./node_modules/.bin/prettier --write \
  'app/**/*.js' \
  'app/**/*.scss' \
  'app/**/*.json' \
  'app/**/*.html' \
  'build/**/*.js' \
  'desktop/**/*.js' \
  'plugins/**/*.js' \
  'util/**/*.js' \
  '*.js' \
  'package.json' \
  '!app/lib/*.js' \
  '!app/scripts/locales/de-DE.json' \
  '!app/scripts/locales/fr-FR.json'
