'use strict';

var Dropbox = require('dropbox');

var DropboxKeys = {
    AppFolder: 'qp7ctun6qt5n9d6'
};

var DropboxLink = {
    _getClient: function(complete) {
        if (this._dropboxClient) {
            complete(null, this._dropboxClient);
            return;
        }
        var client = new Dropbox.Client({ key: DropboxKeys.AppFolder });
        client.authDriver(new Dropbox.AuthDriver.Popup({ receiverUrl: location.href }));
        client.authenticate((function(error, client) {
            if (!error) {
                this._dropboxClient = client;
            }
            complete(error, client);
        }).bind(this));
    },

    receive: function() {
        Dropbox.AuthDriver.Popup.oauthReceiver();
    },

    saveFile: function(fileName, data, overwrite, complete) {
        this._getClient(function(err, client) {
            if (err) { return complete(err); }
            if (!overwrite) {
                client.readdir('', function(err, files) {
                    if (err) { return complete(err); }
                    var exists = files.some(function(file) { return file.toLowerCase() === fileName.toLowerCase(); });
                    if (exists) { return complete({ exists: true }); }
                    client.writeFile(fileName, data, complete);
                });
            } else {
                client.writeFile(fileName, data, complete);
            }
        });
    },

    openFile: function(fileName, complete) {
        this._getClient(function(err, client) {
            if (err) { return complete(err); }
            client.readFile(fileName, { blob: true }, complete);
        });
    },

    getFileList: function(complete) {
        this._getClient(function(err, client) {
            if (err) { return complete(err); }
            client.readdir('', function(err, files) {
                if (err) { return complete(err); }
                files = files.filter(function(f) { return /\.kdbx$/i.test(f); });
                complete(null, files);
            });
        });
    }
};

module.exports = DropboxLink;
