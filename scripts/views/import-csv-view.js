import * as kdbxweb from 'kdbxweb';
import { View } from 'framework/views/view';
import { Scrollable } from 'framework/views/scrollable';
import template from 'templates/import-csv.hbs';
import { EntryModel } from 'models/entry-model';

class ImportCsvView extends View {
    parent = '.app__body';

    template = template;

    events = {
        'click .back-button': 'returnToApp',
        'click .import-csv__button-cancel': 'returnToApp',
        'click .import-csv__button-run': 'runImport',
        'change .import-csv__field-select': 'changeMapping',
        'change .import-csv__target-select': 'changeGroup'
    };

    knownFields = [
        { field: 'Title', re: /title|\bname|account/i },
        { field: 'UserName', re: /user|login/i },
        { field: 'Password', re: /pass/i },
        { field: 'URL', re: /url|site/i },
        { field: 'Notes', re: /notes|comment|extra/i }
    ];

    fieldMapping = [];
    targetGroup = undefined;

    constructor(model, options) {
        super(model, options);
        this.appModel = options.appModel;
        this.fileName = options.fileName;
        this.guessFieldMapping();
        this.fillGroups();
        this.initScroll();
    }

    render() {
        super.render({
            headers: this.model.headers,
            rows: this.model.rows,
            fieldMapping: this.fieldMapping,
            groups: this.groups
        });
        this.createScroll({
            root: this.$el.find('.import-csv__body')[0],
            scroller: this.$el.find('.import-csv__body > .scroller')[0],
            bar: this.$el.find('.import-csv__body > .scroller__bar-wrapper > .scroller__bar')[0]
        });
        this.pageResized();
        if (!this.scroll._update) {
            this.scroll._update = this.scroll.update;
            this.scroll.update = this.scrollUpdate.bind(this);
        }
    }

    scrollUpdate() {
        this.scroller.css({ width: 'auto', minWidth: 'auto', maxWidth: 'auto' });
        this.scroll._update();
    }

    returnToApp() {
        this.emit('cancel');
    }

    changeMapping(e) {
        const col = +e.target.dataset.col;
        const field = e.target.value;

        const isBuiltIn = this.knownFields.some((f) => f.field === field);
        const mapping = field ? (isBuiltIn ? 'builtin' : 'custom') : 'ignore';

        this.fieldMapping[col] = {
            mapping,
            field
        };

        if (field) {
            let ix = 0;
            for (const mapping of this.fieldMapping) {
                if (mapping.field === field && col !== ix) {
                    mapping.type = 'ignore';
                    mapping.field = '';
                    const select = this.el.querySelector(
                        `.import-csv__field-select[data-col="${ix}"]`
                    );
                    select.value = '';
                }
                ix++;
            }
        }
    }

    guessFieldMapping() {
        const usedFields = {};

        for (const fieldName of this.model.headers.map((f) => f.trim())) {
            if (!fieldName || /^(group|grouping)$/i.test(fieldName)) {
                this.fieldMapping.push({ type: 'ignore' });
                continue;
            }

            let found = false;
            for (const { field, re } of this.knownFields) {
                if (!usedFields[field] && re.test(fieldName)) {
                    this.fieldMapping.push({ type: 'builtin', field });
                    usedFields[field] = true;
                    found = true;
                    break;
                }
            }

            if (!found) {
                this.fieldMapping.push({ type: 'custom', field: fieldName });
            }
        }
    }

    fillGroups() {
        this.groups = [];
        for (const file of this.appModel.files) {
            file.forEachGroup((group) => {
                const title = group.title;
                const spaces = [];
                for (let parent = group; parent.parentGroup; parent = parent.parentGroup) {
                    spaces.push(' ', ' ');
                }
                this.groups.push({ id: group.id, fileId: file.id, spaces, title });
            });
        }
    }

    changeGroup(e) {
        const groupId = e.target.value;
        if (!groupId) {
            this.targetGroup = undefined;
            return;
        }
        const fileId = e.target.querySelector(`option[value="${groupId}"]`).dataset.file;
        const file = this.appModel.files.get(fileId);
        this.targetGroup = file.getGroup(groupId);
    }

    runImport() {
        let group = this.targetGroup;

        let filePromise;
        if (group) {
            filePromise = Promise.resolve(group.file);
        } else {
            const fileName = this.fileName.replace(/\.csv$/i, '');
            filePromise = new Promise((resolve) => this.appModel.createNewFile(fileName, resolve));
        }

        filePromise.then((file) => {
            if (!group) {
                group = file.groups[0];
            }

            for (const row of this.model.rows) {
                const newEntry = EntryModel.newEntry(group, file);
                for (let ix = 0; ix < row.length; ix++) {
                    let value = row[ix];
                    if (!value) {
                        continue;
                    }
                    const mapping = this.fieldMapping[ix];
                    if (mapping.type === 'ignore' || !mapping.field) {
                        continue;
                    }
                    if (mapping.field === 'Password') {
                        value = kdbxweb.ProtectedValue.fromString(value);
                    }
                    newEntry.setField(mapping.field, value);
                }
            }

            file.reload();
            this.emit('done');
        });
    }
}

Object.assign(ImportCsvView.prototype, Scrollable);

export { ImportCsvView };
