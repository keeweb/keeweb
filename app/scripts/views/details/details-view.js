import * as kdbxweb from 'kdbxweb';
import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { AutoType } from 'auto-type';
import { CopyPaste } from 'comp/browser/copy-paste';
import { KeyHandler } from 'comp/browser/key-handler';
import { OtpQrReader } from 'comp/format/otp-qr-reader';
import { Alerts } from 'comp/ui/alerts';
import { Keys } from 'const/keys';
import { Timeouts } from 'const/timeouts';
import { AppSettingsModel } from 'models/app-settings-model';
import { GroupModel } from 'models/group-model';
import { Features } from 'util/features';
import { Locale } from 'util/locale';
import { FileSaver } from 'util/ui/file-saver';
import { Tip } from 'util/ui/tip';
import { Copyable } from 'framework/views/copyable';
import { Scrollable } from 'framework/views/scrollable';
import { DetailsAddFieldView } from 'views/details/details-add-field-view';
import { DetailsAttachmentView } from 'views/details/details-attachment-view';
import { DetailsAutoTypeView } from 'views/details/details-auto-type-view';
import { DetailsHistoryView } from 'views/details/details-history-view';
import { DetailsIssuesView } from 'views/details/details-issues-view';
import { DropdownView } from 'views/dropdown-view';
import { createDetailsFields, createNewCustomField } from 'views/details/details-fields';
import { FieldViewCustom } from 'views/fields/field-view-custom';
import { IconSelectView } from 'views/icon-select-view';
import { isEqual } from 'util/fn';
import { Launcher } from 'comp/launcher';
import dompurify from 'dompurify';
import template from 'templates/details/details.hbs';
import emptyTemplate from 'templates/details/details-empty.hbs';
import groupTemplate from 'templates/details/details-group.hbs';

class DetailsView extends View {
    parent = '.app__details';
    fieldViews = [];
    fieldCopyTip = null;

    events = {
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
    };

    constructor(model, options) {
        super(model, options);
        this.initScroll();
        this.listenTo(Events, 'entry-selected', this.showEntry);
        this.listenTo(Events, 'copy-password', this.copyPassword);
        this.listenTo(Events, 'copy-user', this.copyUserName);
        this.listenTo(Events, 'copy-url', this.copyUrl);
        this.listenTo(Events, 'copy-otp', this.copyOtp);
        this.listenTo(Events, 'toggle-settings', this.settingsToggled);
        this.listenTo(Events, 'context-menu-select', this.contextMenuSelect);
        this.listenTo(Events, 'set-locale', this.render);
        this.listenTo(Events, 'qr-read', this.otpCodeRead);
        this.listenTo(Events, 'qr-enter-manually', this.otpEnterManually);
        this.onKey(
            Keys.DOM_VK_C,
            this.copyPasswordFromShortcut,
            KeyHandler.SHORTCUT_ACTION,
            false,
            true
        );

        this.onKey(Keys.DOM_VK_B, this.copyUserName, KeyHandler.SHORTCUT_ACTION);
        this.onKey(Keys.DOM_VK_U, this.copyUrl, KeyHandler.SHORTCUT_ACTION);
        this.onKey(Keys.DOM_VK_2, this.copyOtp, KeyHandler.SHORTCUT_OPT);
        if (AutoType.enabled) {
            this.onKey(Keys.DOM_VK_T, () => this.autoType(), KeyHandler.SHORTCUT_ACTION);
        }

        this.onKey(
            Keys.DOM_VK_DELETE,
            this.deleteKeyPress,
            KeyHandler.SHORTCUT_ACTION,
            false,
            true
        );

        this.onKey(
            Keys.DOM_VK_BACK_SPACE,
            this.deleteKeyPress,
            KeyHandler.SHORTCUT_ACTION,
            false,
            true
        );

        this.once('remove', () => {
            this.removeFieldViews();
        });
    }

    removeFieldViews() {
        this.fieldViews.forEach((fieldView) => fieldView.remove());
        this.fieldViews = [];
        this.hideFieldCopyTip();
    }

    render() {
        Tip.destroyTips(this.$el);
        this.removeScroll();
        this.removeFieldViews();
        this.removeInnerViews();
        if (!this.model) {
            this.template = emptyTemplate;
            super.render();
            return;
        }

        if (typeof AppSettingsModel._temp === 'undefined') {
            AppSettingsModel._temp = {};
        }

        if (this.model instanceof GroupModel) {
            this.template = groupTemplate;
            super.render();
            return;
        }

        const model = {
            deleted: this.appModel.filter.trash,
            canEditColor: this.model.file.supportsColors && !this.model.readOnly,
            canEditIcon: this.model.file.supportsIcons && !this.model.readOnly,
            showButtons: !this.model.backend && !this.model.readOnly,
            ...this.model
        };

        this.template = template;
        super.render(model);
        this.setSelectedColor(this.model.color);
        this.addFieldViews();
        this.checkPasswordIssues();
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
    }

    getFieldView(name) {
        return this.fieldViews.find((fv) => fv.model.name === name);
    }

    addFieldViews() {
        const { fieldViews, fieldViewsAside } = createDetailsFields(this);
        const hideEmptyFields = AppSettingsModel.hideEmptyFields;

        const fieldsMainEl = this.$el.find('.details__body-fields');
        const fieldsAsideEl = this.$el.find('.details__body-aside');
        for (const views of [fieldViews, fieldViewsAside]) {
            for (const fieldView of views) {
                fieldView.parent = views === fieldViews ? fieldsMainEl[0] : fieldsAsideEl[0];
                fieldView.render();
                fieldView.on('change', this.fieldChanged.bind(this));
                fieldView.on('copy', (e) => this.copyFieldValue(e));
                fieldView.on('autotype', (e) => this.autoType(e.source.model.sequence));
                if (hideEmptyFields) {
                    const value = fieldView.model.value();
                    if (!value || value.length === 0 || value.byteLength === 0) {
                        if (this.model.isJustCreated) {
                            const fieldsHiddenForNewEntriesWhenEmpty = [
                                '$URL',
                                '$Notes',
                                'Tags',
                                'Expires',
                                'History'
                            ];
                            if (
                                !fieldsHiddenForNewEntriesWhenEmpty.includes(fieldView.model.name)
                            ) {
                                continue;
                            }
                        }
                        fieldView.hide();
                    }
                }
            }
        }

        this.fieldViews = fieldViews.concat(fieldViewsAside);

        if (!this.model.backend) {
            this.moreView = new DetailsAddFieldView();
            this.moreView.render();
            this.moreView.on('add-field', this.addNewField.bind(this));
            this.moreView.on('more-click', this.toggleMoreOptions.bind(this));
        }
    }

    addNewField(title) {
        this.moreView.remove();
        this.moreView = null;
        let newFieldTitle = title || Locale.detNetField;

        if (this.model.fields[newFieldTitle]) {
            for (let i = 1; ; i++) {
                const newFieldTitleVariant = newFieldTitle + i;
                if (!this.model.fields[newFieldTitleVariant]) {
                    newFieldTitle = newFieldTitleVariant;
                    break;
                }
            }
        }

        const fieldView = createNewCustomField(
            newFieldTitle,
            {
                parent: this.$el.find('.details__body-fields')[0]
            },
            this.model
        );

        fieldView.on('change', this.fieldChanged.bind(this));
        fieldView.render();
        fieldView.edit();
        this.fieldViews.push(fieldView);
    }

    toggleMoreOptions() {
        if (this.views.dropdownView) {
            this.views.dropdownView.remove();
            this.views.dropdownView = null;
        } else {
            setTimeout(() => {
                const dropdownView = new DropdownView();
                this.listenTo(dropdownView, 'cancel', this.toggleMoreOptions);
                this.listenTo(dropdownView, 'select', this.moreOptionsSelect);
                const hideEmptyFields = AppSettingsModel.hideEmptyFields;
                const moreOptions = [];
                if (hideEmptyFields) {
                    this.fieldViews.forEach((fieldView) => {
                        if (fieldView.isHidden()) {
                            moreOptions.push({
                                value: 'add:' + fieldView.model.name,
                                icon: 'pencil',
                                text: Locale.detMenuAddField.replace('{}', fieldView.model.title)
                            });
                        }
                    }, this);
                    moreOptions.push({
                        value: 'add-new',
                        icon: 'plus',
                        text: Locale.detMenuAddNewField
                    });
                    if (this.model.url) {
                        moreOptions.push({
                            value: 'add-website',
                            icon: 'plus',
                            text: Locale.detMenuAddNewWebsite
                        });
                    }
                    moreOptions.push({
                        value: 'toggle-empty',
                        icon: 'eye',
                        text: Locale.detMenuShowEmpty
                    });
                } else {
                    moreOptions.push({
                        value: 'add-new',
                        icon: 'plus',
                        text: Locale.detMenuAddNewField
                    });
                    if (this.model.url) {
                        moreOptions.push({
                            value: 'add-website',
                            icon: 'plus',
                            text: Locale.detMenuAddNewWebsite
                        });
                    }
                    moreOptions.push({
                        value: 'toggle-empty',
                        icon: 'eye-slash',
                        text: Locale.detMenuHideEmpty
                    });
                }

                moreOptions.push({ value: 'otp', icon: 'clock', text: Locale.detSetupOtp });
                if (AutoType.enabled) {
                    moreOptions.push({
                        value: 'auto-type',
                        icon: 'keyboard',
                        text: Locale.detAutoTypeSettings
                    });
                }

                moreOptions.push({ value: 'clone', icon: 'clone', text: Locale.detClone });
                moreOptions.push({
                    value: 'copy-to-clipboard',
                    icon: 'copy',
                    text: Locale.detCopyEntryToClipboard
                });

                const rect = this.moreView.labelEl[0].getBoundingClientRect();
                dropdownView.render({
                    position: { top: rect.bottom, left: rect.left },
                    options: moreOptions
                });

                this.views.dropdownView = dropdownView;
            });
        }
    }

    moreOptionsSelect(e) {
        this.views.dropdownView.remove();
        this.views.dropdownView = null;
        switch (e.item) {
            case 'add-new':
                this.addNewField();
                break;
            case 'add-website':
                this.addNewField(this.model.getNextUrlFieldName());
                break;
            case 'toggle-empty': {
                const hideEmptyFields = AppSettingsModel.hideEmptyFields;
                AppSettingsModel.hideEmptyFields = !hideEmptyFields;
                this.render();
                break;
            }
            case 'otp':
                this.setupOtp();
                break;
            case 'auto-type':
                this.toggleAutoType();
                break;
            case 'clone':
                this.clone();
                break;
            case 'copy-to-clipboard':
                this.copyToClipboard();
                break;
            default:
                if (e.item.lastIndexOf('add:', 0) === 0) {
                    const fieldName = e.item.slice(4);
                    const fieldView = this.fieldViews.find((f) => f.model.name === fieldName);
                    fieldView.show();
                    fieldView.edit();
                }
        }
    }

    getUserNameCompletions(part) {
        return this.appModel.completeUserNames(part);
    }

    setSelectedColor(color) {
        this.$el
            .find('.details__colors-popup > .details__colors-popup-item')
            .removeClass('details__colors-popup-item--active');
        const colorEl = this.$el.find('.details__header-color')[0];

        for (const cls of colorEl.classList) {
            if (cls.indexOf('color') > 0 && cls.lastIndexOf('details', 0) !== 0) {
                colorEl.classList.remove(cls);
            }
        }

        if (color) {
            this.$el
                .find('.details__colors-popup > .' + color + '-color')
                .addClass('details__colors-popup-item--active');
            colorEl.classList.add(color + '-color');
        }
    }

    selectColor(e) {
        let color = $(e.target).closest('.details__colors-popup-item').data('color');
        if (!color) {
            return;
        }

        if (color === this.model.color) {
            color = null;
        }

        this.model.setColor(color);
        this.entryUpdated();
    }

    toggleIcons() {
        if (this.model.backend) {
            return;
        }

        if (this.views.sub && this.views.sub instanceof IconSelectView) {
            this.render();
            return;
        }

        this.removeSubView();
        const subView = new IconSelectView(
            {
                iconId: this.model.customIconId || this.model.iconId,
                url: this.model.url,
                file: this.model.file
            },
            {
                parent: this.scroller[0],
                replace: true
            }
        );

        this.listenTo(subView, 'select', this.iconSelected);
        subView.render();
        this.pageResized();
        this.views.sub = subView;
    }

    /*
        Toggle Attachments
    */

    toggleAttachment(e) {
        // since keeweb can render markdown, remove .app__details background image. only solid color should appear behind markdown
        const cssBackground = dompurify.sanitize('none');
        this.$el.css('background', cssBackground);

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
        const subView = new DetailsAttachmentView(attachment, {
            parent: this.scroller[0],
            replace: true
        });

        subView.attId = id;
        subView.render(this.pageResized.bind(this));
        subView.on('download', () => this.downloadAttachment(attachment));
        this.listenTo(subView, 'close', this.render.bind(this));
        this.views.sub = subView;
        attBtn.addClass('details__attachment--active');
    }

    removeSubView() {
        this.$el.find('.details__attachment').removeClass('details__attachment--active');
        if (this.views.sub) {
            this.views.sub.remove();
            delete this.views.sub;
        }
    }

    downloadAttachment(attachment) {
        const data = attachment.getBinary();
        if (!data) {
            return;
        }

        const mimeType = attachment.mimeType || 'application/octet-stream';
        const blob = new Blob([data], { type: mimeType });
        FileSaver.saveAs(blob, attachment.title);
    }

    iconSelected(sel) {
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
    }

    showEntry(entry) {
        this.model = entry;
        this.initOtp();
        this.render();

        if (entry && !entry.title && entry.isJustCreated) {
            this.editTitle();
        }
    }

    initOtp() {
        this.matchingOtpEntry = null;

        if (!this.model) {
            return;
        }

        this.model.initOtpGenerator?.();
        if (this.model.backend === 'otp-device') {
            return;
        }

        this.matchingOtpEntry = this.appModel.getMatchingOtpEntry(this.model);
        this.matchingOtpEntry?.initOtpGenerator();
    }

    copyKeyPress(editView) {
        if (!editView || this.isHidden()) {
            return false;
        }

        if (!window.getSelection().toString()) {
            const fieldText = editView.getTextValue();
            if (!fieldText) {
                return;
            }

            if (!CopyPaste.simpleCopy) {
                CopyPaste.createHiddenInput(fieldText);
            }

            const copyRes = CopyPaste.copy(fieldText);
            this.copyFieldValue({ source: editView, copyRes });

            return true;
        }
        return false;
    }

    copyPasswordFromShortcut(e) {
        if (!this.model) {
            return;
        }
        if (this.model.backend === 'otp-device') {
            this.copyOtp();
            e.preventDefault();
        }
        const copied = this.copyKeyPress(this.getFieldView('$Password'));
        if (copied) {
            e.preventDefault();
        }
    }

    copyPassword() {
        this.copyKeyPress(this.getFieldView('$Password'));
    }

    copyUserName() {
        this.copyKeyPress(this.getFieldView('$UserName'));
    }

    copyUrl() {
        this.copyKeyPress(this.getFieldView('$URL'));
    }

    copyOtp() {
        const otpField = this.getFieldView('$otp');
        if (this.model.backend === 'otp-device') {
            if (!otpField) {
                return false;
            }
            otpField.copyValue();
            return true;
        }
        this.copyKeyPress(otpField);
    }

    showCopyTip() {
        if (this.helpTipCopyShown) {
            return;
        }
        this.helpTipCopyShown = AppSettingsModel.helpTipCopyShown;
        if (this.helpTipCopyShown) {
            return;
        }
        AppSettingsModel.helpTipCopyShown = true;
        this.helpTipCopyShown = true;
        const label = this.moreView.labelEl;
        const tip = new Tip(label, { title: Locale.detCopyHint, placement: 'right' });
        tip.show();
        this.fieldCopyTip = tip;
        setTimeout(() => {
            tip.hide();
        }, Timeouts.AutoHideHint);
    }

    settingsToggled() {
        this.hideFieldCopyTip();
    }

    fieldChanged(e) {
        if (e.field) {
            if (e.field[0] === '$') {
                let fieldName = e.field.slice(1);
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
                    Events.emit('entry-selected', this.model);
                    return;
                } else if (fieldName) {
                    this.model.setField(fieldName, e.val);
                }
                if (fieldName === 'Password' && this.views.issues) {
                    this.views.issues.passwordChanged();
                }
            } else if (e.field === 'Tags') {
                this.model.setTags(e.val);
                this.appModel.updateTags();
            } else if (e.field === 'Expires') {
                const dt = e.val || undefined;
                if (!isEqual(dt, this.model.expires)) {
                    this.model.setExpires(dt);
                }
            }

            this.entryUpdated(true);
            this.fieldViews.forEach(function (fieldView, ix) {
                // TODO: render the view instead
                if (
                    (fieldView instanceof FieldViewCustom &&
                        !fieldView.model.newField &&
                        !this.model.hasField(fieldView.model.title)) ||
                    (fieldView.model.isExtraUrl &&
                        !fieldView.model.newField &&
                        !this.model.hasField(fieldView.model.name.replace('$', '')))
                ) {
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
    }

    otpFieldChanged(value) {
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
    }

    dragover(e) {
        e.preventDefault();
        e.stopPropagation();
        const dt = e.dataTransfer;
        if (
            !dt.types ||
            (dt.types.indexOf ? dt.types.indexOf('Files') === -1 : !dt.types.contains('Files'))
        ) {
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
    }

    dragleave() {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.dragTimeout = setTimeout(() => {
            this.$el.find('.details').removeClass('details--drag');
            this.dragging = false;
        }, 100);
    }

    drop(e) {
        e.preventDefault();
        if (!this.model) {
            return;
        }
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.$el.find('.details').removeClass('details--drag');
        this.dragging = false;
        const files = e.target.files || e.dataTransfer.files;
        this.addAttachedFiles(files);
    }

    attachmentBtnClick() {
        this.$el.find('.details__attachment-input-file')[0].click();
    }

    attachmentFileChange(e) {
        this.addAttachedFiles(e.target.files);
    }

    addAttachedFiles(files) {
        for (const file of files) {
            const reader = new FileReader();
            reader.onload = () => {
                this.addAttachment(file.name, reader.result);
            };
            reader.readAsArrayBuffer(file);
        }
    }

    addAttachment(name, data) {
        this.model.addAttachment(name, data).then(() => {
            this.entryUpdated();
        });
    }

    deleteKeyPress(e) {
        if (this.views.sub && this.views.sub.attId !== undefined) {
            e.preventDefault();
            const attachment = this.model.attachments[this.views.sub.attId];
            this.model.removeAttachment(attachment.title);
            this.render();
        }
    }

    editTitle() {
        if (this.model.backend === 'otp-device') {
            return;
        }
        const input = $('<input/>')
            .addClass('details__header-title-input')
            .attr({ autocomplete: 'off', spellcheck: 'false', placeholder: Locale.title })
            .val(this.model.title);
        input.bind({
            blur: this.titleInputBlur.bind(this),
            input: this.titleInputInput.bind(this),
            keydown: this.titleInputKeydown.bind(this),
            keypress: this.titleInputInput.bind(this)
        });
        $('.details__header-title').replaceWith(input);
        input.focus()[0].setSelectionRange(this.model.title.length, this.model.title.length);
    }

    titleInputBlur(e) {
        this.setTitle(e.target.value);
    }

    titleInputInput(e) {
        e.stopPropagation();
    }

    titleInputKeydown(e) {
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
                Events.emit('refresh');
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
    }

    setTitle(title) {
        if (this.model.title instanceof kdbxweb.ProtectedValue) {
            title = kdbxweb.ProtectedValue.fromString(title);
        }

        if (title !== this.model.title) {
            this.model.setField('Title', title);
            this.entryUpdated(true);
        }

        const newTitle = $('<h1 class="details__header-title"></h1>').text(
            title || `(${Locale.noTitle})`
        );

        this.$el.find('.details__header-title-input').replaceWith(newTitle);
    }

    entryUpdated(skipRender) {
        Events.emit('entry-updated', { entry: this.model });
        this.initOtp();
        if (!skipRender) {
            this.render();
        }
    }

    focusNextField(config) {
        let found = false,
            nextFieldView;
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
    }

    showHistory() {
        this.removeSubView();
        const subView = new DetailsHistoryView(this.model, {
            parent: this.scroller[0],
            replace: true
        });
        this.listenTo(subView, 'close', this.historyClosed.bind(this));
        subView.render();
        this.pageResized();
        this.views.sub = subView;
    }

    historyClosed(e) {
        if (e.updated) {
            this.entryUpdated();
        } else {
            this.render();
        }
    }

    moveToTrash() {
        const doMove = () => {
            this.model.moveToTrash();
            Events.emit('refresh');
        };
        if (Features.isMobile) {
            Alerts.yesno({
                header: Locale.detDelToTrash,
                body: Locale.detDelToTrashBody,
                icon: 'trash-can',
                success: doMove
            });
        } else {
            doMove();
        }
    }

    clone() {
        const newEntry = this.model.cloneEntry(' ' + Locale.detClonedName);
        Events.emit('select-entry', newEntry);
    }

    copyToClipboard() {
        CopyPaste.copyHtml(this.model.getHtml());
    }

    deleteFromTrash() {
        Alerts.yesno({
            header: Locale.detDelFromTrash,
            body: Locale.detDelFromTrashBody,
            hint: Locale.detDelFromTrashBodyHint,
            icon: 'circle-minus',
            success: () => {
                this.model.deleteFromTrash();
                Events.emit('refresh');
            }
        });
    }

    backClick() {
        Events.emit('toggle-details', false);
    }

    contextMenu(e) {
        const canCopy = document.queryCommandSupported('copy');
        const options = [];
        if (canCopy) {
            if (this.model.backend === 'otp-device') {
                options.push({
                    value: 'det-copy-otp',
                    icon: 'copy',
                    text: Locale.detMenuCopyOtp
                });
            } else {
                options.push({
                    value: 'det-copy-password',
                    icon: 'copy',
                    text: Locale.detMenuCopyPassword
                });
            }
            options.push({
                value: 'det-copy-user',
                icon: 'copy',
                text: Locale.detMenuCopyUser
            });
        }
        if (!this.model.backend) {
            options.push({ value: 'det-add-new', icon: 'plus', text: Locale.detMenuAddNewField });
            options.push({ value: 'det-clone', icon: 'clone', text: Locale.detClone });
            if (canCopy) {
                options.push({
                    value: 'copy-to-clipboard',
                    icon: 'clipboard',
                    text: Locale.detCopyEntryToClipboard
                });
            }
        }
        if (AutoType.enabled) {
            options.push({ value: 'det-auto-type', icon: 'keyboard', text: Locale.detAutoType });
        }
        Events.emit('show-context-menu', Object.assign(e, { options }));
    }

    contextMenuSelect(e) {
        switch (e.item) {
            case 'det-copy-password':
                this.copyPassword();
                break;
            case 'det-copy-user':
                this.copyUserName();
                break;
            case 'det-copy-otp':
                this.copyOtp();
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
            case 'copy-to-clipboard':
                this.copyToClipboard();
                break;
        }
    }

    setupOtp() {
        OtpQrReader.read();
    }

    otpCodeRead(otp) {
        this.model.setOtp(otp);
        this.entryUpdated();
    }

    otpEnterManually() {
        if (this.model.fields.otp) {
            const otpField = this.fieldViews.find((f) => f.model.name === '$otp');
            if (otpField) {
                otpField.edit();
            }
        } else {
            this.moreView.remove();
            this.moreView = null;
            const fieldView = new FieldViewCustom(
                {
                    name: '$otp',
                    title: 'otp',
                    newField: 'otp',
                    value: kdbxweb.ProtectedValue.fromString('')
                },
                {
                    parent: this.$el.find('.details__body-fields')[0]
                }
            );
            fieldView.on('change', this.fieldChanged.bind(this));
            fieldView.render();
            fieldView.edit();
            this.fieldViews.push(fieldView);
        }
    }

    toggleAutoType() {
        if (this.views.autoType) {
            this.views.autoType.remove();
            delete this.views.autoType;
            return;
        }
        this.views.autoType = new DetailsAutoTypeView(this.model);
        this.views.autoType.render();
    }

    autoType(sequence) {
        const entry = this.model;
        const hasOtp =
            sequence?.includes('{TOTP}') || (entry.backend === 'otp-device' && !sequence);
        if (hasOtp) {
            const otpField = this.getFieldView('$otp');
            otpField.refreshOtp((err) => {
                if (!err) {
                    Events.emit('auto-type', {
                        entry,
                        sequence,
                        context: { resolved: { totp: otpField.otpValue } }
                    });
                }
            });
        } else {
            Events.emit('auto-type', { entry, sequence });
        }
    }

    checkPasswordIssues() {
        if (!this.model.readOnly) {
            this.views.issues = new DetailsIssuesView(this.model);
            this.views.issues.render();
        }
    }

    copyFieldValue(e) {
        this.fieldCopied(e);
        if (AppSettingsModel.minimizeOnFieldCopy) {
            Launcher.minimizeApp();
        }
    }
}

Object.assign(DetailsView.prototype, Scrollable);
Object.assign(DetailsView.prototype, Copyable);

export { DetailsView };
