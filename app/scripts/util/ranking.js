const Ranking = {
    getStringRank: function(s1, s2) {
        let ix = s1.indexOf(s2);
        if (ix === 0 && s1.length === s2.length) {
            return 10;
        } else if (ix === 0) {
            return 5;
        } else if (ix > 0) {
            return 3;
        }
        ix = s2.indexOf(s1);
        if (ix === 0) {
            return 5;
        } else if (ix > 0) {
            return 3;
        }
        return 0;
    }
};

module.exports = Ranking;
