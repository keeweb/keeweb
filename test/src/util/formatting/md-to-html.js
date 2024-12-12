import { expect } from 'chai';
import { MdToHtml } from 'util/formatting/md-to-html';

/*
    Uses internal library which converts markdown to html
    @ref        app/scripts/util/formatting/md-to-html.js
*/

describe('MdToHtml', () => {
    it('should convert markdown', () => {
        expect(MdToHtml.convert('## head\n_italic_', true, false)).to.eql({
            html: '<div class="markdown"><h2>head</h2>\n<p><em>italic</em></p>\n</div>'
        });
    });

    it('should not add markdown wrapper tags for plaintext', () => {
        expect(MdToHtml.convert('plain\ntext', true, false)).to.eql({ text: 'plain\ntext' });
    });

    it('should convert links', () => {
        expect(MdToHtml.convert('[link](https://x)', true, false)).to.eql({
            html:
                '<div class="markdown">' +
                '<p><a href="https://x" rel="noreferrer noopener" target="_blank">link</a></p>\n' +
                '</div>'
        });
    });

    it('should convert markdown image to html', () => {
        expect(
            MdToHtml.convert('![keeweb logo](https://keeweb.info/img/logo.png)', true, false)
        ).to.eql({
            html:
                '<div class="markdown">' +
                '<p><img alt="keeweb logo" src="https://keeweb.info/img/logo.png"></p>\n' +
                '</div>'
        });
    });

    it('should convert markdown unordered lists to html', () => {
        expect(MdToHtml.convert('- unordered 1\n- unordered 2\n- unordered 3', true, false)).to.eql(
            {
                html:
                    '<div class="markdown">' +
                    '<ul>\n<li>unordered 1</li>\n<li>unordered 2</li>\n<li>unordered 3</li>\n</ul>\n' +
                    '</div>'
            }
        );
    });

    it('should convert markdown codeblock to html', () => {
        expect(MdToHtml.convert('```php<?php   echo "Hello";?>```', true, false)).to.eql({
            html:
                '<div class="markdown">' +
                '<p><code>php&lt;?php   echo "Hello";?&gt;</code></p>\n' +
                '</div>'
        });
    });

    it('should convert markdown codeblock to html with highlight.js syntax highlighting', () => {
        expect(MdToHtml.convert('```php\n<?php\necho "Hello";\n?>\n```', true, false)).to.eql({
            html:
                '<div class="markdown">' +
                '<pre><code class="language-php"><span class="hljs-meta">&lt;?php</span>\n' +
                '<span class="hljs-keyword">echo</span> <span class="hljs-string">"Hello"</span>;\n' +
                '<span class="hljs-meta">?&gt;</span>\n' +
                '</code></pre>\n' +
                '</div>'
        });
    });
});
