const StringUtil = {
    camelCaseRegex: /\-./g,

    camelCase(str) {
        return str.replace(this.camelCaseRegex, match => match[1].toUpperCase());
    }
};

module.exports = StringUtil;
