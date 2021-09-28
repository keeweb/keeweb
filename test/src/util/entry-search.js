import { expect } from 'chai';
import { EntrySearch } from 'util/entry-search';

describe('EntrySearch', () => {
    it('should match an empty filter', () => {
        const search = new EntrySearch({ searchText: '' });
        expect(search.matches()).to.be.true;
    });

    it('should not match an empty entry', () => {
        const search = new EntrySearch({ searchText: '' });
        expect(search.matches({ textLower: 'test' })).to.be.false;
    });

    it('should match a simple string', () => {
        const search = new EntrySearch({ searchText: 'some test' });
        expect(search.matches({ textLower: 'test' })).to.be.true;
    });

    it('should not match a non-existing string', () => {
        const search = new EntrySearch({ searchText: 'some test' });
        expect(search.matches({ textLower: 'something' })).to.be.false;
    });

    it('should match text parts', () => {
        const search = new EntrySearch({ searchText: 'some test' });
        expect(
            search.matches({
                textLower: 'some test',
                textLowerParts: ['some', 'test']
            })
        ).to.be.true;
        expect(
            search.matches({
                textLower: 'test some',
                textLowerParts: ['test', 'some']
            })
        ).to.be.true;
    });
});
