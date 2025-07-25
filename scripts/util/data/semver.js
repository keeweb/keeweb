const SemVer = {
    compareVersions(left, right) {
        left = left.replace(/-.*$/, '').split('.');
        right = right.replace(/-.*$/, '').split('.');
        for (let num = 0; num < left.length; num++) {
            const partLeft = left[num] | 0;
            const partRight = right[num] | 0;
            if (partLeft < partRight) {
                return -1;
            }
            if (partLeft > partRight) {
                return 1;
            }
        }
        return 0;
    }
};

export { SemVer };
