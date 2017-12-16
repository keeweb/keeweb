#!/usr/bin/env bash
echo Cloning KeeWeb into $PWD/keeweb...
mkdir keeweb
git clone git@github.com:keeweb/favicon-proxy.git keeweb/favicon-proxy
git clone git@github.com:keeweb/kdbxweb.git keeweb/kdbxweb
git clone git@github.com:keeweb/keeweb.git -b develop keeweb/keeweb
git clone git@github.com:keeweb/beta.keeweb.info.git keeweb/keeweb-beta
git clone git@github.com:keeweb/keeweb-site.git -b gh-pages keeweb/keeweb-site
git clone git@github.com:keeweb/keeweb-plugins.git keeweb/keeweb-plugins
git clone git@github.com:keeweb/keeweb.git -b gh-pages --single-branch keeweb/keeweb-dist
mkdir keeweb/keys
echo kdbxweb/ > keeweb/.eslintignore
echo Done! KeeWeb is cloned into $PWD/keeweb
