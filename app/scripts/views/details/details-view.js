const Backbone = require('backbone');
const kdbxweb = require('kdbxweb');
const GroupModel = require('../../models/group-model');
const AppSettingsModel = require('../../models/app-settings-model');
const Scrollable = require('../../mixins/scrollable');
const FieldViewText = require('../fields/field-view-text');
const FieldViewSelect = require('../fields/field-view-select');
const FieldViewAutocomplete = require('../fields/field-view-autocomplete');
const FieldViewDate = require('../fields/field-view-date');
const FieldViewTags = require('../fields/field-view-tags');
const FieldViewUrl = require('../fields/field-view-url');
const FieldViewReadOnly = require('../fields/field-view-read-only');
const FieldViewHistory = require('../fields/field-view-history');
const FieldViewCustom = require('../fields/field-view-custom');
const FieldViewOtp = require('../fields/field-view-otp');
const IconSelectView = require('../icon-select-view');
const DetailsHistoryView = require('./details-history-view');
const DetailsAttachmentView = require('./details-attachment-view');
const DetailsAddFieldView = require('./details-add-field-view');
const DetailsAutoTypeView = require('./details-auto-type-view');
const DropdownView = require('../../views/dropdown-view');
const Keys = require('../../const/keys');
const KeyHandler = require('../../comp/key-handler');
const Alerts = require('../../comp/alerts');
const CopyPaste = require('../../comp/copy-paste');
const OtpQrReader = require('../../comp/otp-qr-reader');
const AutoType = require('../../auto-type');
const Format = require('../../util/format');
const Locale = require('../../util/locale');
const Tip = require('../../util/tip');
const FileSaver = require('../../util/file-saver');
const Timeouts = require('../../const/timeouts');
const Copyable = require('../../mixins/copyable');

const DetailsView = Backbone.View.extend({
    template: require('templates/details/details.hbs'),
    emptyTemplate: require('templates/details/details-empty.hbs'),
    groupTemplate: require('templates/details/details-group.hbs'),

    fieldViews: null,
    views: null,
    passEditView: null,
    userEditView: null,
    urlEditView: null,
    fieldCopyTip: null,

    events: {
        'click .details__colors-popup-item': 'selectColor',
        'click .details__header-icon': 'toggleIcons',
        'click .details__attachment': 'toggleAttachment',
        'click .details__header-title': 'editTitle',
        'click .details__history-link': 'showHistory',
        'click .details__buttons-trash': 'moveToTrash',
        'click .details__buttons-trash-del': 'deleteFromTrash',
        'click .details__back-button': 'backClick',
        'click .details__attachment-add': 'attachmentBtnClick',
        'change .details__attachment-input-file': 'attachmentFileChange',
        'dragover .details': 'dragover',
        'dragleave .details': 'dragleave',
        'drop .details': 'drop',
        'contextmenu .details': 'contextMenu'
    },

    initialize: function () {
        this.fieldViews = [];
        this.views = {};
        this.initScroll();
        this.listenTo(Backbone, 'entry-selected', this.showEntry);
        this.listenTo(Backbone, 'copy-password', this.copyPassword);
        this.listenTo(Backbone, 'copy-user', this.copyUserName);
        this.listenTo(Backbone, 'copy-url', this.copyUrl);
        this.listenTo(Backbone, 'toggle-settings', this.settingsToggled);
        this.listenTo(Backbone, 'context-menu-select', this.contextMenuSelect);
        this.listenTo(Backbone, 'set-locale', this.render);
        this.listenTo(OtpQrReader, 'qr-read', this.otpCodeRead);
        this.listenTo(OtpQrReader, 'enter-manually', this.otpEnterManually);
        KeyHandler.onKey(Keys.DOM_VK_C, this.copyPassword, this, KeyHandler.SHORTCUT_ACTION, false, true);
        KeyHandler.onKey(Keys.DOM_VK_B, this.copyUserName, this, KeyHandler.SHORTCUT_ACTION, false, true);
        KeyHandler.onKey(Keys.DOM_VK_U, this.copyUrl, this, KeyHandler.SHORTCUT_ACTION, false, true);
        if (AutoType.enabled) {
            KeyHandler.onKey(Keys.DOM_VK_T, this.autoType, this, KeyHandler.SHORTCUT_ACTION);
        }
        KeyHandler.onKey(Keys.DOM_VK_DELETE, this.deleteKeyPress, this, KeyHandler.SHORTCUT_ACTION, false, true);
        KeyHandler.onKey(Keys.DOM_VK_BACK_SPACE, this.deleteKeyPress, this, KeyHandler.SHORTCUT_ACTION, false, true);
    },

    remove: function() {
        KeyHandler.offKey(Keys.DOM_VK_C, this.copyPassword, this);
        KeyHandler.offKey(Keys.DOM_VK_B, this.copyUserName, this);
        KeyHandler.offKey(Keys.DOM_VK_U, this.copyUrl, this);
        KeyHandler.offKey(Keys.DOM_VK_DELETE, this.deleteKeyPress, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.offKey(Keys.DOM_VK_BACK_SPACE, this.deleteKeyPress, this, KeyHandler.SHORTCUT_ACTION);
        this.removeFieldViews();
        Backbone.View.prototype.remove.call(this);
    },

    removeFieldViews: function() {
        this.fieldViews.forEach(fieldView => fieldView.remove());
        this.fieldViews = [];
        this.hideFieldCopyTip();
    },

    render: function () {
        this.removeScroll();
        this.removeFieldViews();
        this.removeInnerViews();
        if (!this.model) {
            this.$el.html(this.emptyTemplate());
            return;
        }
        if (this.model instanceof GroupModel) {
            this.$el.html(this.groupTemplate());
            Tip.createTips(this.$el);
            return;
        }
        const model = $.extend({ deleted: this.appModel.filter.trash }, this.model);
        this.$el.html(this.template(model));
        Tip.createTips(this.$el);
        this.setSelectedColor(this.model.color);
        this.model.initOtpGenerator();
        this.addFieldViews();
        this.createScroll({
            root: this.$el.find('.details__body')[0],
            scroller: this.$el.find('.scroller')[0],
            bar: this.$el.find('.scroller__bar')[0]
        });
        this.$el.find('.details').removeClass('details--drag');
        this.dragging = false;
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.pageResized();
        this.showCopyTip();
        return this;
    },

    addFieldViews: function() {
        const model = this.model;
        if (model.isJustCreated && this.appModel.files.length > 1) {
            const fileNames = this.appModel.files.map(function(file) {
                return { id: file.id, value: file.get('name'), selected: file === this.model.file };
            }, this);
            this.fileEditView = new FieldViewSelect({ model: { name: '$File', title: Format.capFirst(Locale.file),
                value: function() { return fileNames; } } });
            this.fieldViews.push(this.fileEditView);
        } else {
            this.fieldViews.push(new FieldViewReadOnly({ model: { name: 'File', title: Format.capFirst(Locale.file),
                value: function() { return model.fileName; } } }));
        }
        this.userEditView = new FieldViewAutocomplete({ model: { name: '$UserName', title: Format.capFirst(Locale.user),
            value: function() { return model.user; }, getCompletions: this.getUserNameCompletions.bind(this) } });
        this.fieldViews.push(this.userEditView);
        this.passEditView = new FieldViewText({ model: { name: '$Password', title: Format.capFirst(Locale.password), canGen: true,
            value: function() { return model.password; } } });
        this.fieldViews.push(this.passEditView);
        this.urlEditView = new FieldViewUrl({ model: { name: '$URL', title: Format.capFirst(Locale.website),
            value: function() { return model.url; } } });
        this.fieldViews.push(this.urlEditView);
        this.fieldViews.push(new FieldViewText({ model: { name: '$Notes', title: Format.capFirst(Locale.notes), multiline: 'true',
            value: function() { return model.notes; } } }));
        this.fieldViews.push(new FieldViewTags({ model: { name: 'Tags', title: Format.capFirst(Locale.tags), tags: this.appModel.tags,
            value: function() { return model.tags; } } }));
        this.fieldViews.push(new FieldViewDate({ model: { name: 'Expires', title: Locale.detExpires, lessThanNow: '(' + Locale.detExpired + ')',
            value: function() { return model.expires; } } }));
        this.fieldViews.push(new FieldViewReadOnly({ model: { name: 'Group', title: Locale.detGroup,
            value: function() { return model.groupName; }, tip: function() { return model.getGroupPath().join(' / '); } } }));
        this.fieldViews.push(new FieldViewReadOnly({ model: { name: 'Created', title: Locale.detCreated,
            value: function() { return Format.dtStr(model.created); } } }));
        this.fieldViews.push(new FieldViewReadOnly({ model: { name: 'Updated', title: Locale.detUpdated,
            value: function() { return Format.dtStr(model.updated); } } }));
        this.fieldViews.push(new FieldViewHistory({ model: { name: 'History', title: Format.capFirst(Locale.history),
            value: function() { return { length: model.historyLength, unsaved: model.unsaved }; } } }));
        _.forEach(model.fields, function(value, field) {
            if (field === 'otp' && this.model.otpGenerator) {
                this.fieldViews.push(new FieldViewOtp({ model: { name: '$' + field, title: field,
                    value: function() { return model.otpGenerator; } } }));
            } else {
                this.fieldViews.push(new FieldViewCustom({ model: { name: '$' + field, title: field,
                    value: function() { return model.fields[field]; } } }));
            }
        }, this);

        const hideEmptyFields = AppSettingsModel.instance.get('hideEmptyFields');

        const fieldsMainEl = this.$el.find('.details__body-fields');
        const fieldsAsideEl = this.$el.find('.details__body-aside');
        this.fieldViews.forEach(function(fieldView) {
            fieldView.setElement(fieldView.readonly ? fieldsAsideEl : fieldsMainEl).render();
            fieldView.on('change', this.fieldChanged.bind(this));
            fieldView.on('copy', this.fieldCopied.bind(this));
            if (hideEmptyFields) {
                const value = fieldView.model.value();
                if (!value || value.length === 0 || value.byteLength === 0) {
                    if (this.model.isJustCreated && ['$UserName', '$Password'].indexOf(fieldView.model.name) >= 0) {
                        return; // don't hide user for new records
                    }
                    fieldView.hide();
                }
            }
        }, this);

        this.moreView = new DetailsAddFieldView();
        this.moreView.setElement(fieldsMainEl).render();
        this.moreView.on('add-field', this.addNewField.bind(this));
        this.moreView.on('more-click', this.toggleMoreOptions.bind(this));
    },

    addNewField: function() {
        this.moreView.remove();
        this.moreView = null;
        let newFieldTitle = Locale.detNetField;
        if (this.model.fields[newFieldTitle]) {
            for (let i = 1; ; i++) {
                const newFieldTitleVariant = newFieldTitle + i;
                if (!this.model.fields[newFieldTitleVariant]) {
                    newFieldTitle = newFieldTitleVariant;
                    break;
                }
            }
        }
        const fieldView = new FieldViewCustom({ model: { name: '$' + newFieldTitle, title: newFieldTitle, newField: newFieldTitle,
            value: function() { return ''; } } });
        fieldView.on('change', this.fieldChanged.bind(this));
        fieldView.setElement(this.$el.find('.details__body-fields')).render();
        fieldView.edit();
        this.fieldViews.push(fieldView);
    },

    toggleMoreOptions: function() {
        if (this.views.dropdownView) {
            this.views.dropdownView.remove();
            this.views.dropdownView = null;
        } else {
            this.setTimeout(function() {
                const dropdownView = new DropdownView();
                this.listenTo(dropdownView, 'cancel', this.toggleMoreOptions);
                this.listenTo(dropdownView, 'select', this.moreOptionsSelect);
                const hideEmptyFields = AppSettingsModel.instance.get('hideEmptyFields');
                const moreOptions = [];
                if (hideEmptyFields) {
                    this.fieldViews.forEach(fieldView => {
                        if (fieldView.isHidden()) {
                            moreOptions.push({value: 'add:' + fieldView.model.name, icon: 'pencil',
                                text: Locale.detMenuAddField.replace('{}', fieldView.model.title)});
                        }
                    }, this);
                    moreOptions.push({value: 'add-new', icon: 'plus', text: Locale.detMenuAddNewField});
                    moreOptions.push({value: 'toggle-empty', icon: 'eye', text: Locale.detMenuShowEmpty});
                } else {
                    moreOptions.push({value: 'add-new', icon: 'plus', text: Locale.detMenuAddNewField});
                    moreOptions.push({value: 'toggle-empty', icon: 'eye-slash', text: Locale.detMenuHideEmpty});
                }
                moreOptions.push({value: 'otp', icon: 'clock-o', text: Locale.detSetupOtp});
                if (AutoType.enabled) {
                    moreOptions.push({value: 'auto-type', icon: 'keyboard-o', text: Locale.detAutoTypeSettings});
                }
                moreOptions.push({value: 'clone', icon: 'clone', text: Locale.detClone});
                const rect = this.moreView.labelEl[0].getBoundingClientRect();
                dropdownView.render({
                    position: {top: rect.bottom, left: rect.left},
                    options: moreOptions
                });
                this.views.dropdownView = dropdownView;
            });
        }
    },

    moreOptionsSelect: function(e) {
        this.views.dropdownView.remove();
        this.views.dropdownView = null;
        switch (e.item) {
            case 'add-new':
                this.addNewField();
                break;
            case 'toggle-empty':
                const hideEmptyFields = AppSettingsModel.instance.get('hideEmptyFields');
                AppSettingsModel.instance.set('hideEmptyFields', !hideEmptyFields);
                this.render();
                break;
            case 'otp':
                this.setupOtp();
                break;
            case 'auto-type':
                this.toggleAutoType();
                break;
            case 'clone':
                this.clone();
                break;
            default:
                if (e.item.lastIndexOf('add:', 0) === 0) {
                    const fieldName = e.item.substr(4);
                    const fieldView = _.find(this.fieldViews, f => f.model.name === fieldName);
                    fieldView.show();
                    fieldView.edit();
                }
        }
    },

    getUserNameCompletions: function(part) {
        return this.appModel.completeUserNames(part);
    },

    setSelectedColor: function(color) {
        this.$el.find('.details__colors-popup > .details__colors-popup-item').removeClass('details__colors-popup-item--active');
        const colorEl = this.$el.find('.details__header-color')[0];
        _.forEach(colorEl.classList, cls => {
            if (cls.indexOf('color') > 0 && cls.lastIndexOf('details', 0) !== 0) {
                colorEl.classList.remove(cls);
            }
        });
        if (color) {
            this.$el.find('.details__colors-popup > .' + color + '-color').addClass('details__colors-popup-item--active');
            colorEl.classList.add(color + '-color');
        }
    },

    selectColor: function(e) {
        let color = $(e.target).closest('.details__colors-popup-item').data('color');
        if (!color) {
            return;
        }
        if (color === this.model.color) {
            color = null;
        }
        this.model.setColor(color);
        this.entryUpdated();
    },

    toggleIcons: function() {
        if (this.views.sub && this.views.sub instanceof IconSelectView) {
            this.render();
            return;
        }
        this.removeSubView();
        const subView = new IconSelectView({
            el: this.scroller,
            model: {
                iconId: this.model.customIconId || this.model.iconId,
                url: this.model.url, file: this.model.file
            }
        });
        this.listenTo(subView, 'select', this.iconSelected);
        subView.render();
        this.pageResized();
        this.views.sub = subView;
    },

    toggleAttachment: function(e) {
        const attBtn = $(e.target).closest('.details__attachment');
        const id = attBtn.data('id');
        const attachment = this.model.attachments[id];
        if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) {
            this.downloadAttachment(attachment);
            return;
        }
        if (this.views.sub && this.views.sub.attId === id) {
            this.render();
            return;
        }
        this.removeSubView();
        const subView = new DetailsAttachmentView({ el: this.scroller, model: attachment });
        subView.attId = id;
        subView.render(this.pageResized.bind(this));
        this.views.sub = subView;
        attBtn.addClass('details__attachment--active');
    },

    removeSubView: function() {
        this.$el.find('.details__attachment').removeClass('details__attachment--active');
        if (this.views.sub) {
            this.views.sub.remove();
            delete this.views.sub;
        }
    },

    downloadAttachment: function(attachment) {
        const data = attachment.getBinary();
        if (!data) {
            return;
        }
        const mimeType = attachment.mimeType || 'application/octet-stream';
        const blob = new Blob([data], {type: mimeType});
        FileSaver.saveAs(blob, attachment.title);
    },

    iconSelected: function(sel) {
        if (sel.custom) {
            if (sel.id !== this.model.customIconId) {
                this.model.setCustomIcon(sel.id);
                this.entryUpdated();
            } else {
                this.render();
            }
        } else if (sel.id !== this.model.iconId) {
            this.model.setIcon(+sel.id);
            this.entryUpdated();
        } else {
            this.render();
        }
    },

    showEntry: function(entry) {
        this.model = entry;
        this.render();
        if (entry && !entry.title && entry.isJustCreated) {
            this.editTitle();
        }
    },

    copyKeyPress: function(editView) {
        if (this.isHidden()) { return; }
        if (!window.getSelection().toString()) {
            const fieldValue = editView.value;
            const fieldText = fieldValue && fieldValue.isProtected ? fieldValue.getText() : fieldValue;
            if (!fieldText) {
                return;
            }
            if (!CopyPaste.simpleCopy) {
                CopyPaste.createHiddenInput(fieldText);
            }
            const copyRes = CopyPaste.copy(fieldText);
            this.fieldCopied({ source: editView, copyRes: copyRes });
        }
    },

    copyPassword: function() {
        this.copyKeyPress(this.passEditView);
    },

    copyUserName: function() {
        this.copyKeyPress(this.userEditView);
    },

    copyUrl: function() {
        this.copyKeyPress(this.urlEditView);
    },

    showCopyTip: function() {
        if (this.helpTipCopyShown) {
            return;
        }
        this.helpTipCopyShown = AppSettingsModel.instance.get('helpTipCopyShown');
        if (this.helpTipCopyShown) {
            return;
        }
        AppSettingsModel.instance.set('helpTipCopyShown', true);
        this.helpTipCopyShown = true;
        const label = this.moreView.labelEl;
        const tip = new Tip(label, { title: Locale.detCopyHint, placement: 'right' });
        tip.show();
        this.fieldCopyTip = tip;
        setTimeout(() => { tip.hide(); }, Timeouts.AutoHideHint);
    },

    settingsToggled: function() {
        this.hideFieldCopyTip();
    },

    fieldChanged: function(e) {
        if (e.field) {
            if (e.field[0] === '$') {
                let fieldName = e.field.substr(1);
                if (fieldName === 'otp') {
                    if (this.otpFieldChanged(e.val)) {
                        this.entryUpdated();
                        return;
                    }
                } else if (e.newField) {
                    if (fieldName) {
                        this.model.setField(fieldName, undefined);
                    }
                    fieldName = e.newField;
                    let i = 0;
                    while (this.model.hasField(fieldName)) {
                        i++;
                        fieldName = e.newField + i;
                    }
                    const allowEmpty = this.model.group.isEntryTemplatesGroup();
                    this.model.setField(fieldName, e.val, allowEmpty);
                    this.entryUpdated();
                    return;
                } else if (fieldName === 'File') {
                    const newFile = this.appModel.files.get(e.val);
                    this.model.moveToFile(newFile);
                    this.appModel.activeEntryId = this.model.id;
                    this.entryUpdated();
                    Backbone.trigger('entry-selected', this.model);
                    return;
                } else if (fieldName) {
                    this.model.setField(fieldName, e.val);
                }
            } else if (e.field === 'Tags') {
                this.model.setTags(e.val);
                this.appModel.updateTags();
            } else if (e.field === 'Expires') {
                const dt = e.val || undefined;
                if (!_.isEqual(dt, this.model.expires)) {
                    this.model.setExpires(dt);
                }
            }
            this.entryUpdated(true);
            this.fieldViews.forEach(function(fieldView, ix) {
                if (fieldView instanceof FieldViewCustom && !fieldView.model.newField &&
                    !this.model.hasField(fieldView.model.title)) {
                    fieldView.remove();
                    this.fieldViews.splice(ix, 1);
                } else {
                    fieldView.update();
                }
            }, this);
        } else if (e.newField) {
            this.render();
            return;
        }
        if (e.tab) {
            this.focusNextField(e.tab);
        }
    },

    otpFieldChanged: function(value) {
        let oldValue = this.model.fields.otp;
        if (oldValue && oldValue.isProtected) {
            oldValue = oldValue.getText();
        }
        if (value && value.isProtected) {
            value = value.getText();
        }
        if (oldValue === value) {
            this.render();
            return false;
        }
        this.model.setOtpUrl(value);
        return true;
    },

    dragover: function(e) {
        e.preventDefault();
        e.stopPropagation();
        const dt = e.originalEvent.dataTransfer;
        if (!dt.types || (dt.types.indexOf ? dt.types.indexOf('Files') === -1 : !dt.types.contains('Files'))) {
            dt.dropEffect = 'none';
            return;
        }
        dt.dropEffect = 'copy';
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        if (this.model && !this.dragging) {
            this.dragging = true;
            this.$el.find('.details').addClass('details--drag');
        }
    },

    dragleave: function() {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.dragTimeout = setTimeout(() => {
            this.$el.find('.details').removeClass('details--drag');
            this.dragging = false;
        }, 100);
    },

    drop: function(e) {
        e.preventDefault();
        if (!this.model) {
            return;
        }
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.$el.find('.details').removeClass('details--drag');
        this.dragging = false;
        const files = e.target.files || e.originalEvent.dataTransfer.files;
        this.addAttachedFiles(files);
    },

    attachmentBtnClick: function() {
        this.$el.find('.details__attachment-input-file')[0].click();
    },

    attachmentFileChange: function(e) {
        this.addAttachedFiles(e.target.files);
    },

    addAttachedFiles: function(files) {
        _.forEach(files, function(file) {
            const reader = new FileReader();
            reader.onload = () => {
                this.addAttachment(file.name, reader.result);
            };
            reader.readAsArrayBuffer(file);
        }, this);
    },

    addAttachment: function(name, data) {
        this.model.addAttachment(name, data).then(() => {
            this.entryUpdated();
        });
    },

    deleteKeyPress: function(e) {
        if (this.views.sub && this.views.sub.attId !== undefined) {
            e.preventDefault();
            const attachment = this.model.attachments[this.views.sub.attId];
            this.model.removeAttachment(attachment.title);
            this.render();
        }
    },

    editTitle: function() {
        const input = $('<input/>')
            .addClass('details__header-title-input')
            .attr({ autocomplete: 'off', spellcheck: 'false', placeholder: 'Title' })
            .val(this.model.title);
        input.bind({
            blur: this.titleInputBlur.bind(this),
            input: this.titleInputInput.bind(this),
            keydown: this.titleInputKeydown.bind(this),
            keypress: this.titleInputInput.bind(this)
        });
        $('.details__header-title').replaceWith(input);
        input.focus()[0].setSelectionRange(this.model.title.length, this.model.title.length);
    },

    titleInputBlur: function(e) {
        this.setTitle(e.target.value);
    },

    titleInputInput: function(e) {
        e.stopPropagation();
    },

    titleInputKeydown: function(e) {
        KeyHandler.reg();
        e.stopPropagation();
        const code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            $(e.target).unbind('blur');
            this.setTitle(e.target.value);
        } else if (code === Keys.DOM_VK_ESCAPE) {
            $(e.target).unbind('blur');
            if (this.model.isJustCreated) {
                this.model.removeWithoutHistory();
                Backbone.trigger('refresh');
                return;
            }
            this.render();
        } else if (code === Keys.DOM_VK_TAB) {
            e.preventDefault();
            $(e.target).unbind('blur');
            this.setTitle(e.target.value);
            if (!e.shiftKey) {
                this.focusNextField({ field: '$Title' });
            }
        }
    },

    setTitle: function(title) {
        if (this.model.title instanceof kdbxweb.ProtectedValue) {
            title = kdbxweb.ProtectedValue.fromString(title);
        }
        if (title !== this.model.title) {
            this.model.setField('Title', title);
            this.entryUpdated(true);
        }
        const newTitle = $('<h1 class="details__header-title"></h1>').text(title || '(no title)');
        this.$el.find('.details__header-title-input').replaceWith(newTitle);
    },

    entryUpdated: function(skipRender) {
        Backbone.trigger('entry-updated', { entry: this.model });
        if (!skipRender) {
            this.render();
        }
    },

    focusNextField: function(config) {
        let found = false, nextFieldView;
        if (config.field === '$Title' && !config.prev) {
            found = true;
        }
        const start = config.prev ? this.fieldViews.length - 1 : 0;
        const end = config.prev ? -1 : this.fieldViews.length;
        const inc = config.prev ? -1 : 1;
        for (let i = start; i !== end; i += inc) {
            const fieldView = this.fieldViews[i];
            if (fieldView.model.name === config.field) {
                found = true;
            } else if (found && !fieldView.readonly && !fieldView.isHidden()) {
                nextFieldView = fieldView;
                break;
            }
        }
        if (nextFieldView) {
            nextFieldView.edit();
        }
    },

    showHistory: function() {
        this.removeSubView();
        const subView = new DetailsHistoryView({ el: this.scroller, model: this.model });
        this.listenTo(subView, 'close', this.historyClosed.bind(this));
        subView.render();
        this.pageResized();
        this.views.sub = subView;
    },

    historyClosed: function(e) {
        if (e.updated) {
            this.entryUpdated();
        } else {
            this.render();
        }
    },

    moveToTrash: function() {
        this.model.moveToTrash();
        Backbone.trigger('refresh');
    },

    clone: function() {
        const newEntry = this.model.cloneEntry(' ' + Locale.detClonedName);
        Backbone.trigger('select-entry', newEntry);
    },

    deleteFromTrash: function() {
        Alerts.yesno({
            header: Locale.detDelFromTrash,
            body: Locale.detDelFromTrashBody + ' <p class="muted-color">' + Locale.detDelFromTrashBodyHint + '</p>',
            icon: 'minus-circle',
            success: () => {
                this.model.deleteFromTrash();
                Backbone.trigger('refresh');
            }
        });
    },

    backClick: function() {
        Backbone.trigger('toggle-details', false);
    },

    contextMenu(e) {
        const canCopy = document.queryCommandSupported('copy');
        const options = [];
        if (canCopy) {
            options.push({ value: 'det-copy-password', icon: 'clipboard', text: Locale.detMenuCopyPassword });
            options.push({ value: 'det-copy-user', icon: 'clipboard', text: Locale.detMenuCopyUser });
        }
        options.push({ value: 'det-add-new', icon: 'plus', text: Locale.detMenuAddNewField });
        options.push({ value: 'det-clone', icon: 'clone', text: Locale.detClone });
        if (AutoType.enabled) {
            options.push({ value: 'det-auto-type', icon: 'keyboard-o', text: Locale.detAutoType });
        }
        Backbone.trigger('show-context-menu', _.extend(e, { options }));
    },

    contextMenuSelect(e) {
        switch (e.item) {
            case 'det-copy-password':
                this.copyPassword();
                break;
            case 'det-copy-user':
                this.copyUserName();
                break;
            case 'det-add-new':
                this.addNewField();
                break;
            case 'det-clone':
                this.clone();
                break;
            case 'det-auto-type':
                this.autoType();
                break;
        }
    },

    setupOtp: function() {
        OtpQrReader.read();
    },

    otpCodeRead: function(otp) {
        this.model.setOtp(otp);
        this.entryUpdated();
    },

    otpEnterManually: function() {
        if (this.model.fields.otp) {
            const otpField = this.fieldViews.find(f => f.model.name === '$otp');
            if (otpField) {
                otpField.edit();
            }
        } else {
            this.moreView.remove();
            this.moreView = null;
            const fieldView = new FieldViewCustom({ model: {
                name: '$otp', title: 'otp', newField: 'otp',
                value: kdbxweb.ProtectedValue.fromString('')
            }});
            fieldView.on('change', this.fieldChanged.bind(this));
            fieldView.setElement(this.$el.find('.details__body-fields')).render();
            fieldView.edit();
            this.fieldViews.push(fieldView);
        }
    },

    toggleAutoType: function() {
        if (this.views.autoType) {
            this.views.autoType.remove();
            delete this.views.autoType;
            return;
        }
        this.views.autoType = new DetailsAutoTypeView({
            el: this.$el.find('.details__body-after'),
            model: this.model
        }).render();
    },

    autoType: function() {
        Backbone.trigger('auto-type', { entry: this.model });
    }
});

_.extend(DetailsView.prototype, Scrollable);
_.extend(DetailsView.prototype, Copyable);

module.exports = DetailsView;
