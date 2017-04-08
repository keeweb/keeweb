const IdGenerator = {
    uuid: function() {
        const s4 = IdGenerator.s4;
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    },
    s4: function() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
};

module.exports = IdGenerator;
