import { expect } from 'chai';
import { StringFormat } from 'util/formatting/string-format';

describe('StringFormat', () => {
    it('should capitalize first character', () => {
        expect(StringFormat.capFirst('xYz')).to.eql('XYz');
    });

    it('should add number padding when required', () => {
        expect(StringFormat.pad(123, 5)).to.eql('00123');
    });

    it('should not add number padding when not required', () => {
        expect(StringFormat.pad(123, 3)).to.eql('123');
    });

    it('should add string padding when required', () => {
        expect(StringFormat.padStr('abc', 5)).to.eql('abc  ');
    });

    it('should not add string padding when not required', () => {
        expect(StringFormat.padStr('abc', 3)).to.eql('abc');
    });

    it('should convert kebab case to camel case', () => {
        expect(StringFormat.camelCase('aa-bbb-c')).to.eql('aaBbbC');
    });

    it('should convert kebab case to pascal case', () => {
        expect(StringFormat.pascalCase('aa-bbb-c')).to.eql('AaBbbC');
    });

    it('should replace version', () => {
        expect(StringFormat.replaceVersion('KeeWeb-1.11.123.x64.dmg', 'ver')).to.eql(
            'KeeWeb-ver.x64.dmg'
        );
    });
});
