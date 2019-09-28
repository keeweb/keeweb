import dompurify from 'dompurify';
import marked from 'marked';

const whiteSpaceRegex = /<\/?p>|<br>|\r|\n/g;

const MdToHtml = {
    convert(md) {
        if (!md) {
            return '';
        }
        const html = marked(md);
        const htmlWithoutLineBreaks = html.replace(whiteSpaceRegex, '');
        const mdWithoutLineBreaks = md.replace(whiteSpaceRegex, '');
        if (htmlWithoutLineBreaks === mdWithoutLineBreaks) {
            return md;
        } else {
            const sanitized = dompurify.sanitize(html);
            return `<div class="markdown">${sanitized}</div>`;
        }
    }
};

export { MdToHtml };
