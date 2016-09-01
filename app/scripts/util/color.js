'use strict';

var Colors = require('../const/colors');

var KnownColors = {};

var Color = function(str) {
    var start = str[0] === '#' ? 1 : 0,
        len = str.length === 3 ? 1 : 2;
    this.r = parseInt(str.substr(start, len), 16);
    this.g = parseInt(str.substr(start + len, len), 16);
    this.b = parseInt(str.substr(start + len * 2, len), 16);
    this.setHsl();
};

Color.prototype.setHsl = function() {
    var r = this.r / 255;
    var g = this.g / 255;
    var b = this.b / 255;

    var max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    this.h = h;
    this.s = s;
    this.l = l;
};

Color.prototype.toHex = function() {
    return '#' + hex(this.r) + hex(this.g) + hex(this.b);
};

Color.prototype.distanceTo = function(color) {
    return Math.abs(this.h - color.h);
};

Color.getNearest = function(colorStr) {
    var color = new Color(colorStr);
    if (!color.s) {
        return null;
    }
    var selected = null, minDistance = Number.MAX_VALUE;
    _.forEach(KnownColors, (col, name) => {
        var distance = color.distanceTo(col);
        if (distance < minDistance) {
            minDistance = distance;
            selected = name;
        }
    });
    return selected;
};

Color.getKnownBgColor = function(knownColor) {
    return Colors.BgColors[knownColor] ? '#' + Colors.BgColors[knownColor] : undefined;
};

_.forEach(Colors.ColorsValues, (val, name) => {
    KnownColors[name] = new Color(val);
});

function hex(num) {
    var str = (num || 0).toString(16);
    return str.length < 2 ? '0' + str : str;
}

module.exports = Color;
