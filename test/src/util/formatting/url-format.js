import { expect } from 'chai';
import { UrlFormat } from 'util/formatting/url-format';

describe('UrlFormat', () => {
    it('should extract file name from url', () => {
        expect(UrlFormat.getDataFileName('https://example.com/data/My.file.kDBx?x=1')).to.eql(
            'My.file'
        );
    });

    it('should determine if url represents a kdbx file', () => {
        expect(UrlFormat.isKdbx('//data/file.KdBx')).to.be.true;
        expect(UrlFormat.isKdbx('//data/file.kdb')).to.be.false;
        expect(UrlFormat.isKdbx('//data/file.kdbxx')).to.be.false;
    });

    it('should replace multiple slashes', () => {
        expect(UrlFormat.fixSlashes('//data/file//ext')).to.eql('/data/file/ext');
    });

    it('should get directory url by full url', () => {
        expect(UrlFormat.fileToDir('/var/data/My.file.kdbx')).to.eql('/var/data');
        expect(UrlFormat.fileToDir('\\\\share\\data\\My.file.kdbx')).to.eql('\\\\share\\data');
        expect(UrlFormat.fileToDir('My.file.kdbx')).to.eql('/');
    });

    it('should make url from parts', () => {
        expect(
            UrlFormat.makeUrl('/path', {
                hello: 'world',
                data: '= &'
            })
        ).to.eql('/path?hello=world&data=%3D%20%26');
    });

    it('should make form-data params', () => {
        expect(
            UrlFormat.buildFormData({
                hello: 'world',
                data: '= &'
            })
        ).to.eql('hello=world&data=%3D%20%26');
    });
});
