const crypto = require('crypto');

module.exports = {
    readXoredValue: function readXoredValue(val) {
        const data = Buffer.from(val.data);
        const random = Buffer.from(val.random);

        val.data.fill(0);
        val.random.fill(0);

        for (let i = 0; i < data.length; i++) {
            data[i] ^= random[i];
        }

        random.fill(0);

        return data;
    },

    makeXoredValue: function makeXoredValue(val) {
        const data = Buffer.from(val);
        const random = crypto.randomBytes(data.length);
        for (let i = 0; i < data.length; i++) {
            data[i] ^= random[i];
        }
        const result = { data: [...data], random: [...random] };
        data.fill(0);
        random.fill(0);

        val.fill(0);

        setTimeout(() => {
            result.data.fill(0);
            result.random.fill(0);
        }, 0);

        return result;
    }
};
