import { expect } from 'chai';
import { SemVer } from 'util/data/semver';

describe('SemVer', () => {
    it('compares equal versions', () => {
        expect(SemVer.compareVersions('1.11.1', '1.11.1')).to.eql(0);
    });

    it('compares major versions gt', () => {
        expect(SemVer.compareVersions('11.1.1', '1.11.1')).to.eql(1);
    });

    it('compares major versions lt', () => {
        expect(SemVer.compareVersions('1.11.1', '11.1.1')).to.eql(-1);
    });

    it('compares minor versions gt', () => {
        expect(SemVer.compareVersions('1.11.1', '1.1.11')).to.eql(1);
    });

    it('compares minor versions lt', () => {
        expect(SemVer.compareVersions('1.1.11', '1.11.1')).to.eql(-1);
    });
});
