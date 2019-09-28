const Ranking = {
    getStringRank(s1, s2) {
        if (!s1 || !s2) {
            return 0;
        }
        let ix = indexOf(s1, s2);
        if (ix === 0 && s1.length === s2.length) {
            return 10;
        } else if (ix === 0) {
            return 5;
        } else if (ix > 0) {
            return 3;
        }
        ix = indexOf(s2, s1);
        if (ix === 0) {
            return 5;
        } else if (ix > 0) {
            return 3;
        }
        return 0;
    }
};

function indexOf(target, search) {
    if (target.isProtected) {
        return target.indexOfLower(search);
    }
    if (search.isProtected) {
        return search.indexOfSelfInLower(target);
    }
    return target.indexOf(search);
}

window.Ranking = Ranking;

export { Ranking };
