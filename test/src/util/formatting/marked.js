import { expect } from 'chai';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

/*
    requires external dependencies
        - marked
        - marked-highlight
        - hljs
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

describe('Marked & Highlightjs', () => {
    it('should parse markdown to html (Normal - marked.parse)', () => {
        const md = `**keeweb stromg text** _keeweb italics_ \`keeweb inline block\``;
        marked.setOptions({ renderer: new marked.Renderer() });
        const html = marked.parse(`${md}`);
        expect(html).to.eql(
            `<p><strong>keeweb stromg text</strong> <em>keeweb italics</em> <code>keeweb inline block</code></p>\n`
        );
    });

    it('should parse markdown to html (Inline - marked.parseInline)', () => {
        const md = `**keeweb stromg text** _keeweb italics_ \`keeweb inline block\``;
        marked.setOptions({ renderer: new marked.Renderer() });
        const html = marked.parseInline(`${md}`);
        expect(html).to.eql(
            `<strong>keeweb stromg text</strong> <em>keeweb italics</em> <code>keeweb inline block</code>`
        );
    });

    it('should parse markdown codeblock with marked Highlight.js', () => {
        const md = '```php\n<?php\necho "Hello";\n?>\n```';
        marked.setOptions({ renderer: new marked.Renderer() });
        const html = marked.parse(`${md}`);
        expect(html).to.eql(
            '<pre><code class="language-php"><span class="hljs-meta">&lt;?php</span>\n' +
                '<span class="hljs-keyword">echo</span> <span class="hljs-string">&quot;Hello&quot;</span>;\n' +
                '<span class="hljs-meta">?&gt;</span>\n' +
                '</code></pre>\n'
        );
    });
});
