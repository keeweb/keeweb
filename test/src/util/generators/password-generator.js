import { expect } from 'chai';
import { PasswordGenerator } from 'util/generators/password-generator';

describe('PasswordGenerator', () => {
    it('should generate a password with digits', () => {
        expect(PasswordGenerator.generate({ length: 10, digits: true })).to.match(/^\d{10}$/);
    });

    it('should generate a password with lowercase letters', () => {
        expect(PasswordGenerator.generate({ length: 10, lower: true })).to.match(/^[a-z]{10}$/);
    });

    it('should generate a password with uppercase letters', () => {
        expect(PasswordGenerator.generate({ length: 10, upper: true })).to.match(/^[A-Z]{10}$/);
    });

    it('should generate a password with brackets', () => {
        expect(PasswordGenerator.generate({ length: 10, brackets: true })).to.match(
            /^[(){}[\]<>]{10}$/
        );
    });

    it('should generate a password with ambiguous characters', () => {
        expect(PasswordGenerator.generate({ length: 10, ambiguous: true })).to.match(
            /^[O0oIl]{10}$/
        );
    });

    it('should generate a password with custom characters', () => {
        expect(PasswordGenerator.generate({ length: 10, include: '123' })).to.match(/^[123]{10}$/);
    });

    it('should generate a password with special characters', () => {
        expect(PasswordGenerator.generate({ length: 50, special: true })).to.match(
            /^[!-\/:-@[-`~]{50}$/
        );
    });

    it('should generate a password with high ascii characters', () => {
        expect(PasswordGenerator.generate({ length: 100, high: true })).to.match(/^[¡-þ]{100}$/);
    });

    it('should generate a pronounceable password', () => {
        for (let i = 0; i < 1000; i++) {
            expect(PasswordGenerator.generate({ length: 10, name: 'Pronounceable' })).to.match(
                /^[a-zA-Z]{10}$/
            );
        }
    });

    it('should generate a password with pattern', () => {
        expect(
            PasswordGenerator.generate({
                length: 60,
                pattern: 'Aa1XI-',
                include: '@#',
                digits: true,
                upper: true
            })
        ).to.match(/^([A-Z][a-z][0-9][0-9A-Z@#][@#]-){10}$/);
    });

    it('should include all groups of characters at least once', () => {
        for (let i = 0; i < 10; i++) {
            const password = PasswordGenerator.generate({
                length: 6,
                upper: true,
                lower: true,
                digits: true,
                brackets: true,
                special: true,
                ambiguous: true
            });
            expect(password).to.match(/[A-Z]/);
            expect(password).to.match(/[a-z]/);
            expect(password).to.match(/[0-9]/);
            expect(password).to.match(/[(){}[\]<>]/);
            expect(password).to.match(/[!-\/:-@[-`~]/);
            expect(password).to.match(/[O0oIl]/);
        }
    });

    // https://regex101.com/r/NUNE7G/3
    it('should generate passphrase with 8 words', () => {
        expect(
            PasswordGenerator.generate({
                length: 8,
                name: 'Passphrase',
                spaces: true,
                upper: true
            })
        ).to.match(/^[a-zA-Z-]+(?:\s{1}[a-zA-Z-]+){7,}$/);
    });

    // https://regex101.com/r/vc2fWR/2
    it('should generate passphrase with 6 words ending in number', () => {
        expect(
            PasswordGenerator.generate({
                length: 6,
                name: 'Passphrase',
                digits: true,
                spaces: true,
                upper: true
            })
        ).to.match(/^[a-zA-Z-]+(?:[\d{1}]\s{1}[a-zA-Z-]+){5,}\d{1}$/);
    });

    // https://regex101.com/r/w5gPht/3
    it('should generate passphrase with 7 words seperated by hyphens', () => {
        expect(
            PasswordGenerator.generate({
                length: 7,
                name: 'Passphrase',
                digits: false,
                spaces: false,
                high: true,
                upper: true
            })
        ).to.match(/^[a-zA-Z-]+(?:[\-{1}][a-zA-Z-]+){6,}$/);
    });

    // https://regex101.com/r/vbK2KN/2
    it('should generate passphrase with 10 words seperated by hyphens, spaces with number at end', () => {
        expect(
            PasswordGenerator.generate({
                length: 10,
                name: 'Passphrase',
                digits: true,
                spaces: true,
                high: true,
                upper: true
            })
        ).to.match(/^[a-zA-Z-]+(?:\d{1}\s{1}\-{1}\s{1}[a-zA-Z-]+){9,}\d{1}$/);
    });
});
