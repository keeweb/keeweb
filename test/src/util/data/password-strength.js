import { expect } from 'chai';
import { ProtectedValue } from 'kdbxweb';
import { PasswordStrengthLevel, passwordStrength } from 'util/data/password-strength';

describe('PasswordStrength', () => {
    function check(password, expected) {
        let actual = passwordStrength(ProtectedValue.fromString(password));
        expected = { onlyDigits: false, ...expected };
        actual = { onlyDigits: false, ...actual };
        for (const [prop, expVal] of Object.entries(expected)) {
            expect(actual[prop]).to.eql(expVal, `${prop} is ${expVal} for password "${password}"`);
        }
    }

    it('should throw an error for non-passwords', () => {
        expect(() => passwordStrength('')).to.throw(TypeError);
        expect(() => passwordStrength(null)).to.throw(TypeError);
    });

    it('should return level None for short passwords', () => {
        check('', { level: PasswordStrengthLevel.None, length: 0 });
        check('1234', { level: PasswordStrengthLevel.None, length: 4, onlyDigits: true });
    });

    it('should return level None for single character passwords', () => {
        check('000000000000', { level: PasswordStrengthLevel.None, length: 12, onlyDigits: true });
    });

    it('should return level Low for simple passwords', () => {
        check('12345=', { level: PasswordStrengthLevel.Low, length: 6 });
        check('12345Aa', { level: PasswordStrengthLevel.Low, length: 7 });
        check('1234567a', { level: PasswordStrengthLevel.Low, length: 8 });
        check('1234567ab', { level: PasswordStrengthLevel.Low, length: 9 });
        check('1234Ab', { level: PasswordStrengthLevel.Low, length: 6 });
        check('1234567', { level: PasswordStrengthLevel.Low, length: 7, onlyDigits: true });
        check('123456789012345678', { level: PasswordStrengthLevel.Low, onlyDigits: true });
        check('abcdefghijkl', { level: PasswordStrengthLevel.Low });
    });

    it('should return level Good for passwords matching all criteria', () => {
        check('123456ABcdef', { level: PasswordStrengthLevel.Good, length: 12 });
        check('Abcdef=5k', { level: PasswordStrengthLevel.Good, length: 9 });
        check('12345678901234567890123456', {
            level: PasswordStrengthLevel.Good,
            onlyDigits: true
        });
    });

    it('should work with long passwords', () => {
        check('ABCDabcd_-+=' + '1234567890'.repeat(100), { level: PasswordStrengthLevel.Good });
    });
});
