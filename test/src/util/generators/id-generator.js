import { expect } from 'chai';
import { IdGenerator } from 'util/generators/id-generator';

describe('IdGenerator', () => {
    it('should generate uuid', () => {
        expect(IdGenerator.uuid()).to.match(
            /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
        );
    });

    it('should generate s4', () => {
        expect(IdGenerator.s4()).to.match(/^[a-f0-9]{4}$/i);
    });
});
