import { AppSettingsModel } from 'models/app-settings-model';
import { UrlFormat } from 'util/formatting/url-format';

const ChooserAppKey = 'qp7ctun6qt5n9d6';

const DropboxChooser = function (callback) {
    this.cb = callback;
    this.onMessage = this.onMessage.bind(this);
};

DropboxChooser.prototype.callback = function (err, res) {
    if (this.cb) {
        this.cb(err, res);
    }
    this.cb = null;
};

DropboxChooser.prototype.choose = function () {
    const windowFeatures = 'width=640,height=552,left=357,top=100,resizable=yes,location=yes';
    const url = this.buildUrl();
    this.popup = window.open(url, 'dropbox', windowFeatures);
    if (!this.popup) {
        return this.callback('Failed to open window');
    }
    window.addEventListener('message', this.onMessage);
    this.closeInt = setInterval(this.checkClose.bind(this), 200);
};

DropboxChooser.prototype.buildUrl = function () {
    return UrlFormat.makeUrl('https://www.dropbox.com/chooser', {
        origin: window.location.protocol + '//' + window.location.host,
        'app_key': AppSettingsModel.dropboxAppKey || ChooserAppKey,
        'link_type': 'direct',
        trigger: 'js',
        multiselect: 'false',
        extensions: '',
        folderselect: 'false',
        iframe: 'false',
        version: 2
    });
};

DropboxChooser.prototype.onMessage = function (e) {
    if (e.source !== this.popup || e.origin !== 'https://www.dropbox.com') {
        return;
    }
    const data = JSON.parse(e.data);
    switch (data.method) {
        case 'origin_request':
            e.source.postMessage(JSON.stringify({ method: 'origin' }), 'https://www.dropbox.com');
            break;
        case 'files_selected':
            this.popup.close();
            this.success(data.params);
            break;
        case 'close_dialog':
            this.popup.close();
            break;
        case 'web_session_error':
        case 'web_session_unlinked':
            this.callback(data.method);
            break;
        case 'resize':
            this.popup.resize(data.params);
            break;
        case 'error':
            this.callback(data.params);
            break;
    }
};

DropboxChooser.prototype.checkClose = function () {
    if (this.popup.closed) {
        clearInterval(this.closeInt);
        window.removeEventListener('message', this.onMessage);
        if (!this.result) {
            this.callback('closed');
        }
    }
};

DropboxChooser.prototype.success = function (params) {
    if (!params || !params[0] || !params[0].link || params[0].is_dir) {
        return this.callback('bad result');
    }
    this.result = params[0];
    this.readFile(this.result.link);
};

DropboxChooser.prototype.readFile = function (url) {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
        this.callback(null, { name: this.result.name, data: xhr.response });
    });
    xhr.addEventListener('error', this.callback.bind(this, 'download error'));
    xhr.addEventListener('abort', this.callback.bind(this, 'download abort'));
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.send();
};

export { DropboxChooser };
