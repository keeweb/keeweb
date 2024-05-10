import 'util/kdbxweb/protected-value-ex';
import { shuffle } from 'util/fn';

class RandomNameGenerator {
    randomCharCode() {
        return 97 + Math.floor(Math.random() * 26);
    }
}

function charCodeToHtml(char) {
    // convert certain special chars like space into to non-breaking space
    // ' ' to &#nbsp;
    if (char === 32 || char === 8193 || char === 8239) {
        char = 160;
    }

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
        value.forEachChar((ch) => {
            result += ch === 10 ? '\n' : '•';
        });
        return result;
    },

    asDOM(value) {
        const items = [];

        const gen = new RandomNameGenerator();

        let ix = 0;
        value.forEachChar((char) => {
            const charHtml = charCodeToHtml(char);
            items.push({ html: charHtml, order: ix });

            if (Math.random() > 0.5) {
                const fakeChar = gen.randomCharCode();
                const fakeCharHtml = charCodeToHtml(fakeChar);
                items.push({ html: fakeCharHtml, order: -1 });
            }
            ix++;
        });

        shuffle(items);

        const topEl = document.createElement('div');
        topEl.style.display = 'flex';
        topEl.style.overflow = 'hidden';
        topEl.style.textOverflow = 'ellipsis';

        for (const item of items) {
            const el = document.createElement('div');
            el.innerHTML = item.html;
            if (item.order >= 0) {
                el.style.order = item.order;
            } else {
                el.style.display = 'none';
            }
            topEl.appendChild(el);
        }

        return topEl;
    }
};

export { PasswordPresenter };
