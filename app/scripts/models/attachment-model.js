const Backbone = require('backbone');

const AttachmentModel = Backbone.Model.extend({
    defaults: {},

    initialize: function() {
    },

    setAttachment: function(att) {
        this.title = att.title;
        this.data = att.data;
        this.ext = this._getExtension(this.title);
        this.icon = this._getIcon(this.ext);
        this.mimeType = this._getMimeType(this.ext);
    },

    _getExtension: function(fileName) {
        const ext = fileName ? fileName.split('.').pop() : undefined;
        return ext ? ext.toLowerCase() : undefined;
    },

    _getIcon: function(ext) {
        switch (ext) {
            case 'txt': case 'log': case 'rtf': case 'pem':
                return 'file-text-o';
            case 'html': case 'htm': case 'js': case 'css': case 'xml': case 'config': case 'json': case 'yaml':
            case 'cpp': case 'c': case 'h': case 'cc': case 'hpp': case 'mm': case 'cs': case 'php': case 'sh':
            case 'py': case 'java': case 'rb': case 'cfg': case 'properties': case 'yml': case 'asm': case 'bat':
                return 'file-code-o';
            case 'pdf':
                return 'file-pdf-o';
            case 'zip': case 'rar': case 'bz': case 'bz2': case '7z': case 'gzip': case 'gz': case 'tar':
            case 'cab': case 'ace': case 'dmg': case 'jar':
                return 'file-archive-o';
            case 'doc': case 'docx':
                return 'file-word-o';
            case 'xls': case 'xlsx':
                return 'file-excel-o';
            case 'ppt': case 'pptx':
                return 'file-powerpoint-o';
            case 'jpeg': case 'jpg': case 'png': case 'gif': case 'bmp': case 'tiff': case 'svg': case 'ico': case 'psd':
                return 'file-image-o';
            case 'avi': case 'mp4': case '3gp': case 'm4v': case 'mov': case 'mpeg': case 'mpg': case 'mpe':
                return 'file-video-o';
            case 'mp3': case 'wav': case 'flac':
                return 'file-audio-o';
        }
        return 'file-o';
    },

    _getMimeType: function(ext) {
        switch (ext) {
            case 'txt': case 'log':
            case 'html': case 'htm': case 'js': case 'css': case 'xml': case 'config': case 'json': case 'yaml':
            case 'cpp': case 'c': case 'h': case 'cc': case 'hpp': case 'mm': case 'cs': case 'php': case 'sh':
            case 'py': case 'java': case 'rb': case 'cfg': case 'properties': case 'yml': case 'asm': case 'pem':
                return 'text/plain';
            case 'pdf':
                return 'application/pdf';
            case 'jpeg': case 'jpg': case 'png': case 'gif': case 'bmp': case 'tiff': case 'svg':
                return 'image/' + ext;
        }
    },

    getBinary: function() {
        let data = this.data;
        if (data && data.ref) {
            data = data.value;
        }
        if (data && data.getBinary) {
            data = data.getBinary();
        }
        if (data instanceof ArrayBuffer && data.byteLength) {
            data = new Uint8Array(data);
        }
        if (data instanceof Uint8Array) {
            return data;
        }
    }
});

AttachmentModel.fromAttachment = function(att) {
    const model = new AttachmentModel();
    model.setAttachment(att);
    return model;
};

module.exports = AttachmentModel;
