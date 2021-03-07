const crypto = require('crypto');

module.exports = {
    readXoredValue: function readXoredValue(val) {
        const data = Buffer.from(val.data);
        const salt = Buffer.from(val.salt);

        val.data.fill(0);
        val.salt.fill(0);

        for (let i = 0; i < data.length; i++) {
            data[i] ^= salt[i];
        }

        salt.fill(0);

        return data;
    },

    makeXoredValue: function makeXoredValue(val) {
        const data = Buffer.from(val);
        const salt = crypto.randomBytes(data.length);
        for (let i = 0; i < data.length; i++) {
            data[i] ^= salt[i];
        }
        const result = { data: [...data], salt: [...salt] };
        data.fill(0);
        salt.fill(0);

        val.fill(0);

        setTimeout(() => {
            result.data.fill(0);
            result.salt.fill(0);
        }, 0);

        return result;
    }
};
