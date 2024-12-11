import dompurify from 'dompurify';
import { Marked, marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import markedAlertFa from '@aetherinox/marked-alert-fa';
import markedFootnote from 'marked-footnote';
import hljs from 'highlight.js';

const whiteSpaceRegex = /<\/?p>|<br>|\r|\n/g;

/*
    Marked > renderer

    automatically convert hyperlink targets to new window
*/

class MdRenderer extends marked.Renderer {
    checkbox(text) {
        const checkLabel = text === true ? 'checked="true"' : '';
        return `<label class="task-list-label" contenteditable="false"><input class="checkbox" type="checkbox" ${checkLabel}></label>`;
    }

    link(href, title, text) {
        return super
            .link(href, title, text)
            .replace('<a ', '<a target="_blank" rel="noreferrer noopener" ');
    }
}

/*
    Markdown to HTML

    once markdown has been loaded, convert it over to HTML to display
    within the interface.

    @arg str md
    @arg bool bBreak
    @arg bool bGfm
*/

const MdToHtml = {
    convert(md, bBreak, bGfm) {
        if (!md) {
            return '';
        }

        /*
            support syntax highlighting using highlightjs and marked-highlight
        */

        const marked = new Marked(
            markedHighlight({
                langPrefix: 'hljs language-',
                highlight(code, lang, info) {
                    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                    return hljs.highlight(code, { language }).value;
                }
            })
        );

        /*
            set marked options
            notes field also supports markdown, for those notes, disable github, enable breaks.
            viewing markdown note should act like github, with no automatically added line-breaks
        */

        marked
            .setOptions({
                renderer: new MdRenderer(),
                breaks: bBreak,
                gfm: bGfm,
                tables: true,
                pedantic: false,
                sanitize: false,
                smartLists: false,
                smartypants: false
            })
            .use(markedAlertFa())
            .use(markedFootnote());

        /*
            parse markdown
        */

        const html = marked.parse(`${md}`);

        const htmlWithoutLineBreaks = html.replace(whiteSpaceRegex, '');
        const mdWithoutLineBreaks = md.replace(whiteSpaceRegex, '');
        if (htmlWithoutLineBreaks === mdWithoutLineBreaks) {
            return { text: md };
        } else {
            const sanitized = dompurify.sanitize(html, { ADD_ATTR: ['target'] });
            return { html: `<div class="markdown">${sanitized}</div>` };
        }
    }
};

export { MdToHtml };
