#!/usr/bin/env bash
git clone git@github.com:keeweb/favicon-proxy.git
git clone git@github.com:keeweb/kdbxweb.git
git clone git@github.com:keeweb/keeweb.git
git clone git@github.com:keeweb/beta.keeweb.info.git keeweb-beta
git clone git@github.com:keeweb/keeweb-site.git
git clone git@github.com:keeweb/keeweb-plugins.git
git clone git@github.com:keeweb/keeweb.git keeweb-dist -b gh-pages --single-branch
mkdir keys
echo kdbxweb/ > .eslintignore
