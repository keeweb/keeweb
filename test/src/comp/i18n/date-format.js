import { expect } from 'chai';
import { DateFormat } from 'comp/i18n/date-format';

describe('DateFormat', () => {
    const dt = new Date(2024, 0, 2, 3, 4, 5, 6);

    it('should return months', () => {
        expect(DateFormat.months()).to.eql([
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
        ]);
    });

    it('should return week days', () => {
        expect(DateFormat.weekDays()).to.eql([
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ]);
    });

    it('should return short week days', () => {
        expect(DateFormat.shortWeekDays()).to.eql([
            'Sun',
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat'
        ]);
    });

    it('should format date', () => {
        expect(DateFormat.dStr(dt)).to.eql('Jan 2, 2024');
    });

    it('should format date and time', () => {
        expect(DateFormat.dtStr(dt)).to.eql('Jan 2, 2024, 3:04:05 AM');
    });

    it('should format date and time in sortable format', () => {
        expect(DateFormat.dtStrFs(dt)).to.eql('2024-01-02T03-04-05');
    });
});
