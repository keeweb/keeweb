import { BuiltInFields } from 'const/entry-fields';

class EntrySearch {
    constructor(model) {
        this.model = model;
    }

    matches(filter) {
        if (!filter) {
            return true;
        }
        if (filter.tagLower) {
            if (this.model.searchTags && this.model.searchTags.indexOf(filter.tagLower) < 0) {
                return false;
            }
        }
        if (filter.textLower) {
            if (filter.advanced) {
                if (!this.matchesAdv(filter)) {
                    return false;
                }
            } else if (filter.textLowerParts) {
                const parts = filter.textLowerParts;
                for (let i = 0; i < parts.length; i++) {
                    if (this.model.searchText.indexOf(parts[i]) < 0) {
                        return false;
                    }
                }
            } else {
                if (this.model.searchText.indexOf(filter.textLower) < 0) {
                    return false;
                }
            }
        }
        if (filter.color) {
            if (filter.color === true) {
                if (!this.model.searchColor) {
                    return false;
                }
            } else {
                if (this.model.searchColor !== filter.color) {
                    return false;
                }
            }
        }
        if (filter.autoType) {
            if (!this.model.autoTypeEnabled) {
                return false;
            }
        }
        if (filter.otp) {
            if (
                !this.model.fields.otp &&
                !this.model.fields['TOTP Seed'] &&
                this.model.backend !== 'otp-device'
            ) {
                return false;
            }
        }
        return true;
    }

    matchesAdv(filter) {
        const adv = filter.advanced;
        let search, match;
        if (adv.regex) {
            try {
                search = new RegExp(filter.text, adv.cs ? '' : 'i');
            } catch (e) {
                return false;
            }
            match = EntrySearch.matchRegex;
        } else if (adv.cs) {
            if (filter.textParts) {
                search = filter.textParts;
                match = EntrySearch.matchStringMulti;
            } else {
                search = filter.text;
                match = EntrySearch.matchString;
            }
        } else {
            if (filter.textLowerParts) {
                search = filter.textLowerParts;
                match = EntrySearch.matchStringMultiLower;
            } else {
                search = filter.textLower;
                match = EntrySearch.matchStringLower;
            }
        }
        if (EntrySearch.matchFields(this.model.getAllFields(), adv, match, search)) {
            return true;
        }
        if (adv.history && this.model.getHistoryEntriesForSearch) {
            for (const historyEntry of this.model.getHistoryEntriesForSearch()) {
                if (EntrySearch.matchFields(historyEntry.fields, adv, match, search)) {
                    return true;
                }
            }
        }
        return false;
    }

    static matchString(str, find) {
        if (str.isProtected) {
            return str.includes(find);
        }
        return str.indexOf(find) >= 0;
    }

    static matchStringLower(str, findLower) {
        if (str.isProtected) {
            return str.includesLower(findLower);
        }
        return str.toLowerCase().indexOf(findLower) >= 0;
    }

    static matchStringMulti(str, find, context, lower) {
        for (let i = 0; i < find.length; i++) {
            const item = find[i];
            let strMatches;
            if (lower) {
                strMatches = str.isProtected ? str.includesLower(item) : str.includes(item);
            } else {
                strMatches = str.isProtected ? str.includes(item) : str.includes(item);
            }
            if (strMatches) {
                if (context.matches) {
                    if (!context.matches.includes(item)) {
                        context.matches.push(item);
                    }
                } else {
                    context.matches = [item];
                }
            }
        }
        return context.matches && context.matches.length === find.length;
    }

    static matchStringMultiLower(str, find, context) {
        return EntrySearch.matchStringMulti(str, find, context, true);
    }

    static matchRegex(str, regex) {
        if (str.isProtected) {
            str = str.getText();
        }
        return regex.test(str);
    }

    static matchFields(fields, adv, compare, search) {
        const context = {};
        const matchField = EntrySearch.matchField;
        if (adv.user && matchField(fields.UserName, compare, search, context)) {
            return true;
        }
        if (adv.url && matchField(fields.URL, compare, search, context)) {
            return true;
        }
        if (adv.notes && matchField(fields.Notes, compare, search, context)) {
            return true;
        }
        if (adv.pass && matchField(fields.Password, compare, search, context)) {
            return true;
        }
        if (adv.title && matchField(fields.Title, compare, search, context)) {
            return true;
        }
        let matches = false;
        if (adv.other || adv.protect) {
            const fieldNames = Object.keys(fields);
            matches = fieldNames.some((field) => {
                if (BuiltInFields.indexOf(field) >= 0) {
                    return false;
                }
                if (typeof fields[field] === 'string') {
                    return adv.other && matchField(fields[field], compare, search, context);
                } else {
                    return adv.protect && matchField(fields[field], compare, search, context);
                }
            });
        }
        return matches;
    }

    static matchField(val, compare, search, context) {
        return val ? compare(val, search, context) : false;
    }
}

export { EntrySearch };
