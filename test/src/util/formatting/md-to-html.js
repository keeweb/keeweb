import { expect } from 'chai';
import { MdToHtml } from 'util/formatting/md-to-html';

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
});
