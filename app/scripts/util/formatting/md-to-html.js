import dompurify from 'dompurify';
import marked from 'marked';

const whiteSpaceRegex = /<\/?p>|<br>|\r|\n/g;

class MdRenderer extends marked.Renderer {
    link(href, title, text) {
        return super
            .link(href, title, text)
            .replace('<a ', '<a target="_blank" rel="noreferrer noopener" ');
    }
}

const MdToHtml = {
    convert(md) {
        if (!md) {
            return '';
        }
        const renderer = new MdRenderer();
        const html = marked(md, { renderer, breaks: true });
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
