'use strict';

var PasswordDisplay = {
    present: function(length) {
        return new Array(length + 1).join('•');
    }
};

module.exports = PasswordDisplay;
