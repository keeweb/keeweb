'use strict';

var StringUtil = {
    camelCaseRegex: /\-./g,

    camelCase: function(str) {
        return str.replace(this.camelCaseRegex, function(match) { return match[1].toUpperCase(); });
    }
};

module.exports = StringUtil;
