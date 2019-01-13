const BrowserFocus = function () {
    this.isFocused = false;
    window.onblur = function () { this.isFocused = false; }.bind(this);
    window.onfocus = function () { this.isFocused = true; }.bind(this);
};

BrowserFocus.prototype.hasFocus = function () {
    return this.isFocused;
};

module.exports = BrowserFocus;
