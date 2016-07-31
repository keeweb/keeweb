'use strict';

let AutoTypeFilter = function(windowInfo, appModel) {
    this.title = windowInfo.title;
    this.url = windowInfo.url;
    this.text = '';
    this.ignoreWindowInfo = false;
    this.appModel = appModel;
};

AutoTypeFilter.prototype.getEntries = function() {
    let filter = {
        text: this.text
    };
    if (!this.ignoreWindowInfo) {
        filter.title = this.title; // TODO
        filter.url = this.url; // TODO
    }
    return this.appModel.getEntriesByFilter(filter); // TODO: sort entries
};

module.exports = AutoTypeFilter;
