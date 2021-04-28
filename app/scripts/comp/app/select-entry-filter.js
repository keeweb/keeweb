import { SearchResultCollection } from 'collections/search-result-collection';
import { Ranking } from 'util/data/ranking';

const urlPartsRegex = /^(\w+:\/\/)?(?:(?:www|wwws|secure)\.)?([^\/]+)\/?(.*)/;

class SelectEntryFilter {
    constructor(windowInfo, appModel, files, filterOptions) {
        this.title = windowInfo.title;
        this.url = windowInfo.url;
        this.text = '';
        this.appModel = appModel;
        this.files = files;
        this.filterOptions = filterOptions;
    }

    getEntries() {
        const filter = {
            text: this.text,
            ...this.filterOptions
        };
        this._prepareFilter();
        let entries = this.appModel
            .getEntriesByFilter(filter, this.files)
            .map((e) => [e, this._getEntryRank(e)]);
        entries = entries.filter((e) => e[1]);
        entries = entries.sort((x, y) =>
            x[1] === y[1] ? x[0].title.localeCompare(y[0].title) : y[1] - x[1]
        );
        entries = entries.map((p) => p[0]);
        return new SearchResultCollection(entries, { comparator: 'none' });
    }

    _prepareFilter() {
        this.titleLower = this.title ? this.title.toLowerCase() : null;
        this.urlLower = this.url ? this.url.toLowerCase() : null;
        this.urlParts = this.url ? urlPartsRegex.exec(this.urlLower) : null;
    }

    _getEntryRank(entry) {
        let rank = 0;
        if (this.titleLower && entry.title) {
            rank += Ranking.getStringRank(entry.title.toLowerCase(), this.titleLower);
        }
        if (this.urlParts) {
            if (entry.url) {
                const entryUrlParts = urlPartsRegex.exec(entry.url.toLowerCase());
                if (entryUrlParts) {
                    const [, scheme, domain, path] = entryUrlParts;
                    const [, thisScheme, thisDomain, thisPath] = this.urlParts;
                    if (domain === thisDomain || thisDomain.indexOf('.' + domain) > 0) {
                        if (domain === thisDomain) {
                            rank += 20;
                        } else {
                            rank += 10;
                        }
                        if (path === thisPath) {
                            rank += 10;
                        } else if (path && thisPath) {
                            if (path.lastIndexOf(thisPath, 0) === 0) {
                                rank += 5;
                            } else if (thisPath.lastIndexOf(path, 0) === 0) {
                                rank += 3;
                            }
                        }
                        if (scheme === thisScheme) {
                            rank += 1;
                        }
                    } else {
                        if (entry.searchText.indexOf(this.urlLower) >= 0) {
                            // the url is in some field; include it
                            rank += 5;
                        } else {
                            // another domain; don't show this record at all, ignore title match
                            return 0;
                        }
                    }
                }
            } else {
                if (entry.searchText.indexOf(this.urlLower) >= 0) {
                    // the url is in some field; include it
                    rank += 5;
                }
            }
        }
        return rank;
    }
}

export { SelectEntryFilter };
