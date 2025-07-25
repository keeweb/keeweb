class CsvParser {
    next;
    csv;
    index;
    line = [];
    lines = [];
    value = '';
    error = undefined;

    parse(csv) {
        this.csv = csv.trim().replace(/\r\n/g, '\n');
        this.result = [];
        this.next = this.handleBeforeValue;
        this.index = 0;
        while (this.next && this.index <= this.csv.length) {
            this.next = this.next(this);
        }
        if (this.lines.length <= 1) {
            throw new Error('Empty CSV');
        }
        return { headers: this.lines[0], rows: this.lines.slice(1) };
    }

    handleBeforeValue() {
        const isQuoted = this.csv[this.index] === '"';
        if (isQuoted) {
            this.index++;
            this.value = '';
            return this.handleQuotedValue;
        }
        return this.handleUnquotedValue;
    }

    handleUnquotedValue() {
        const commaIndex = this.csv.indexOf(',', this.index);
        const newLineIndex = this.csv.indexOf('\n', this.index);

        let nextIndex;
        if (commaIndex >= 0 && (newLineIndex < 0 || commaIndex < newLineIndex)) {
            nextIndex = commaIndex;
        } else if (newLineIndex >= 0) {
            nextIndex = newLineIndex;
        } else {
            nextIndex = this.csv.length;
        }

        const value = this.csv.substr(this.index, nextIndex - this.index);
        this.line.push(value);

        this.index = nextIndex;

        return this.handleAfterValue;
    }

    handleQuotedValue() {
        const nextQuoteIndex = this.csv.indexOf('"', this.index);
        const nextBackslashIndex = this.csv.indexOf('\\', this.index);

        if (nextQuoteIndex < 0) {
            this.index = this.csv.length;
            this.error = 'Quoted value not closed';
            return this.handleError;
        }

        if (nextBackslashIndex > 0 && nextBackslashIndex < nextQuoteIndex) {
            const charAfterBackslash = this.csv[nextBackslashIndex + 1];
            if (charAfterBackslash === '"' || charAfterBackslash === '\\') {
                this.value +=
                    this.csv.substr(this.index, nextBackslashIndex - this.index) +
                    charAfterBackslash;
                this.index = nextBackslashIndex + 2;
            } else {
                this.value += this.csv.substr(this.index, nextBackslashIndex - this.index + 1);
                this.index = nextBackslashIndex + 1;
            }
            return this.handleQuotedValue;
        }

        if (this.csv[nextQuoteIndex + 1] === '"') {
            this.value += this.csv.substr(this.index, nextQuoteIndex - this.index + 1);
            this.index = nextQuoteIndex + 2;
            return this.handleQuotedValue;
        }

        this.value += this.csv.substr(this.index, nextQuoteIndex - this.index);
        this.index = nextQuoteIndex + 1;
        this.line.push(this.value);
        this.value = '';

        return this.handleAfterValue;
    }

    handleAfterValue() {
        const hasNextValueOnThisLine = this.csv[this.index] === ',';
        this.index++;
        if (!hasNextValueOnThisLine) {
            this.lines.push(this.line);
            this.line = [];
        }
        return this.handleBeforeValue;
    }

    handleError() {
        throw new Error(this.error);
    }
}

export { CsvParser };
