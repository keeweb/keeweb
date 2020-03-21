import { expect } from 'chai';
import { DateFormat } from 'util/formatting/date-format';

describe('DateFormat', () => {
    const dt = new Date(2020, 0, 2, 3, 4, 5, 6);

    it('should format date', () => {
        expect(DateFormat.dStr(dt)).to.eql('2 Jan 2020');
    });

    it('should format date and time', () => {
        expect(DateFormat.dtStr(dt)).to.eql('2 Jan 2020 03:04:05');
    });

    it('should format date and time in sortable format', () => {
        expect(DateFormat.dtStrFs(dt)).to.eql('2020-01-02T03-04-05');
    });
});
