import { SearchResultCollection } from 'collections/search-result-collection';
import { Ranking } from 'util/data/ranking';

const urlPartsRegex = /^(\w+:\/\/)?(?:(?:www|wwws|secure)\.)?([^\/]+)\/?(.*)/;

class SelectEntryFilter {
    constructor(windowInfo, appModel, files, filterOptions) {
        this.title = windowInfo.title;
        this.useTitle = !!windowInfo.title && !windowInfo.url;
        this.url = windowInfo.url;
        this.useUrl = !!windowInfo.url;
        this.subdomains = true;
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
        if (this.useUrl || this.useTitle) {
            entries = entries.filter((e) => e[1]);
        }
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
        let titleRank = 0;
        let urlRank = 0;

        if (this.useTitle && this.titleLower && entry.title) {
            titleRank = Ranking.getStringRank(entry.title.toLowerCase(), this.titleLower);
            if (!titleRank) {
                return 0;
            }
        }

        if (this.useUrl && this.urlParts) {
            if (entry.url) {
                const entryUrlParts = urlPartsRegex.exec(entry.url.toLowerCase());
                if (entryUrlParts) {
                    const [, scheme, domain, path] = entryUrlParts;
                    const [, thisScheme, thisDomain, thisPath] = this.urlParts;
                    if (
                        domain === thisDomain ||
                        (this.subdomains && thisDomain.indexOf('.' + domain) > 0)
                    ) {
                        if (domain === thisDomain) {
                            urlRank += 20;
                        } else {
                            urlRank += 10;
                        }
                        if (path === thisPath) {
                            urlRank += 10;
                        } else if (path && thisPath) {
                            if (path.lastIndexOf(thisPath, 0) === 0) {
                                urlRank += 5;
                            } else if (thisPath.lastIndexOf(path, 0) === 0) {
                                urlRank += 3;
                            }
                        }
                        if (scheme === thisScheme) {
                            urlRank += 1;
                        }
                    } else {
                        if (entry.searchText.indexOf(this.urlLower) >= 0) {
                            // the url is in some field; include it
                            urlRank += 5;
                        } else {
                            // another domain; don't show this record at all
                        }
                    }
                }
            } else {
                if (entry.searchText.indexOf(this.urlLower) >= 0) {
                    // the url is in some field; include it
                    urlRank += 5;
                }
            }
        }

        if (this.useTitle && !titleRank) {
            return 0;
        }
        if (this.useUrl && !urlRank) {
            return 0;
        }

        return titleRank + urlRank;
    }
}

export { SelectEntryFilter };
