import { Color } from 'util/data/color';

import ThemeVarsScss from '!!raw-loader!../../styles/base/_theme-vars.scss';
import ThemeDefaults from '!!raw-loader!../../styles/themes/_theme-defaults.scss';

const ThemeVars = {
    themeDefaults: null,
    newLineRegEx: /[\n\s]+/g, // don't inline it, see #1656
    themeVarsRegEx: /([\w\-]+):([^:]+),(\$)?/g,

    init() {
        if (this.themeDefaults) {
            return;
        }
        this.themeDefaults = {};
        const propRegex = /\s([\w\-]+):\s*([^,\s]+)/g;
        let match;
        do {
            match = propRegex.exec(ThemeDefaults);
            if (match) {
                const [, name, value] = match;
                this.themeDefaults['--' + name] = value;
            }
        } while (match);
    },

    apply(cssStyle) {
        this.init();
        const matches = ThemeVarsScss.replace(this.newLineRegEx, '').matchAll(this.themeVarsRegEx);
        for (let [, name, def, last] of matches) {
            if (last && def.endsWith(')')) {
                // definitions are written like this:
                //      map-merge((def:val, def:val, ..., last-def:val),$t)
                // so, the last item has "),$" captured, here we're removing that bracket
                def = def.substr(0, def.length - 1);
            }
            const propName = '--' + name;
            const currentValue = cssStyle.getPropertyValue(propName);
            if (currentValue) {
                continue;
            }
            let result = def.replace(/map-get\(\$t,\s*([\w\-]+)\)/g, '--$1');
            let replaced = true;
            const locals = [];
            while (replaced) {
                replaced = false;
                result = result.replace(/([\w\-]+)\([^()]+\)/, (fnText) => {
                    replaced = true;
                    const [, name, argsStr] = fnText.match(/([\w\-]+)\((.*)\)/);
                    const args = argsStr
                        .trim()
                        .split(/\s*,\s*/)
                        .filter((arg) => arg)
                        .map((arg) => this.resolveArg(arg, cssStyle, locals));
                    locals.push(this.fn[name](...args));
                    return 'L' + (locals.length - 1);
                });
            }
            result = locals[locals.length - 1];
            cssStyle.setProperty(propName, result);
        }
    },

    resolveArg(arg, cssStyle, locals) {
        if (/^--/.test(arg)) {
            let cssProp = cssStyle.getPropertyValue(arg);
            if (cssProp) {
                cssProp = cssProp.trim();
            }
            if (cssProp) {
                arg = cssProp;
            } else {
                if (this.themeDefaults[arg]) {
                    arg = this.themeDefaults[arg];
                } else {
                    throw new Error('Css property missing: ' + arg);
                }
            }
        }
        if (/^L/.test(arg)) {
            return locals[arg.substr(1)];
        }
        if (/%$/.test(arg)) {
            return arg.replace(/%$/, '') / 100;
        }
        if (/^-?[\d.]+?$/.test(arg)) {
            return +arg;
        }
        if (/^(#|rgb)/.test(arg)) {
            return new Color(arg);
        }
        throw new Error('Bad css arg: ' + arg);
    },

    fn: {
        'mix'(color1, color2, percent) {
            return color1.mix(color2, percent).toRgba();
        },
        'semi-mute-percent'(mutePercent) {
            return mutePercent / 2;
        },
        'rgba'(color, alpha) {
            const res = new Color(color);
            res.a = alpha;
            return res.toRgba();
        },
        'text-contrast-color'(color, lshift, thBg, thText) {
            if (color.l - lshift >= thBg.l) {
                return thText.toRgba();
            }
            return thBg.toRgba();
        },
        'lightness-alpha'(color, lightness, alpha) {
            const res = new Color(color);
            res.l += Math.min(0, Math.max(1, lightness));
            res.a += Math.min(0, Math.max(1, alpha));
            return res.toHsla();
        },
        'shade'(color, percent) {
            return Color.black.mix(color, percent).toRgba();
        }
    }
};

export { ThemeVars };
