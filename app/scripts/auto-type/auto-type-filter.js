'use strict';

let AutoTypeFilter = function(windowInfo, appModel) {
    this.title = windowInfo.title;
    this.url = windowInfo.url;
    this.text = '';
    this.ignoreWindowInfo = false;
    this.appModel = appModel;
};

AutoTypeFilter.prototype.getEntries = function() {
    return this.appModel.getEntries(); // TODO
};

module.exports = AutoTypeFilter;
