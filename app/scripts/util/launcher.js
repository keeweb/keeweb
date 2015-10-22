'use strict';

var Launcher;

if (window.process && window.process.versions && window.process.versions.electron) {
    Launcher = {
        req: window.require,
        openLink: function(href) {
            this.req('shell').openExternal(href);
        }
    };
}

module.exports = Launcher;
