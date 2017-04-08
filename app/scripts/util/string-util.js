const StringUtil = {
    camelCaseRegex: /\-./g,

    camelCase: function(str) {
        return str.replace(this.camelCaseRegex, match => match[1].toUpperCase());
    }
};

module.exports = StringUtil;
