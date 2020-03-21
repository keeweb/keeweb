import 'util/kdbxweb/protected-value-ex';
import { shuffle } from 'util/fn';

class RandomNameGenerator {
    usedNames = {};

    randomCharCode() {
        return 97 + Math.floor(Math.random() * 26);
    }

    randomElementName() {
        for (let i = 0; i < 1000; i++) {
            let result = '';
            const length = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < length; i++) {
                result += String.fromCharCode(this.randomCharCode());
            }
            if (!this.usedNames[result]) {
                this.usedNames[result] = true;
                return result;
            }
        }
        throw new Error('Failed to generate a random name');
    }
}

function charCodeToHtml(char) {
    return Math.random() < 0.2 ? String.fromCharCode(char) : `&#x${char.toString(16)};`;
}

const PasswordPresenter = {
    present(length) {
        return new Array(length + 1).join('•');
    },

    presentValueWithLineBreaks(value) {
        if (!value) {
            return '';
        }
        let result = '';
        value.forEachChar(ch => {
            result += ch === 10 ? '\n' : '•';
        });
        return result;
    },

    asHtml(value) {
        const html = [];
        const style = [];

        const gen = new RandomNameGenerator();

        const wrapperClass = gen.randomElementName();

        let ix = 0;
        value.forEachChar(char => {
            const className = gen.randomElementName();
            const charHtml = charCodeToHtml(char);
            html.push(`<span class="${className}">${charHtml}</span>`);
            style.push(`.${className}{order:${ix}}`);

            if (Math.random() > 0.5) {
                const fakeClassName = gen.randomElementName();
                const fakeChar = gen.randomCharCode();
                const fakeCharHtml = charCodeToHtml(fakeChar);
                html.push(`<span class="${fakeClassName}">${fakeCharHtml}</span>`);
                style.push(`.${wrapperClass} .${fakeClassName}{display:none}`);
            }
            ix++;
        });

        const everything = html.concat(style.map(s => `<style>${s}</style>`));
        const innerHtml = shuffle(everything).join('');

        return `<div class="${wrapperClass}" style="display: flex">${innerHtml}</div>`;
    }
};

export { PasswordPresenter };
