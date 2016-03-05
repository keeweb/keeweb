'use strict';

var Backbone = require('backbone'),
    kdbxweb = require('kdbxweb'),
    GroupModel = require('../../models/group-model'),
    AppSettingsModel = require('../../models/app-settings-model'),
    Scrollable = require('../../mixins/scrollable'),
    FieldViewText = require('../fields/field-view-text'),
    FieldViewAutocomplete = require('../fields/field-view-autocomplete'),
    FieldViewDate = require('../fields/field-view-date'),
    FieldViewTags = require('../fields/field-view-tags'),
    FieldViewUrl = require('../fields/field-view-url'),
    FieldViewReadOnly = require('../fields/field-view-read-only'),
    FieldViewHistory = require('../fields/field-view-history'),
    FieldViewCustom = require('../fields/field-view-custom'),
    IconSelectView = require('../icon-select-view'),
    DetailsHistoryView = require('./details-history-view'),
    DetailsAttachmentView = require('./details-attachment-view'),
    DetailsAddFieldView = require('./details-add-field-view'),
    DropdownView = require('../../views/dropdown-view'),
    Keys = require('../../const/keys'),
    KeyHandler = require('../../comp/key-handler'),
    Alerts = require('../../comp/alerts'),
    CopyPaste = require('../../comp/copy-paste'),
    Format = require('../../util/format'),
    Locale = require('../../util/locale'),
    Tip = require('../../util/tip'),
    Timeouts = require('../../const/timeouts'),
    FileSaver = require('filesaver');

var DetailsView = Backbone.View.extend({
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
        'dragover .details': 'dragover',
        'dragleave .details': 'dragleave',
        'drop .details': 'drop'
    },

    initialize: function () {
        this.fieldViews = [];
        this.views = {};
        this.initScroll();
        this.listenTo(Backbone, 'select-entry', this.showEntry);
        this.listenTo(Backbone, 'copy-password', this.copyPassword);
        this.listenTo(Backbone, 'copy-user', this.copyUserName);
        this.listenTo(Backbone, 'copy-url', this.copyUrl);
        KeyHandler.onKey(Keys.DOM_VK_C, this.copyPassword, this, KeyHandler.SHORTCUT_ACTION, false, true);
        KeyHandler.onKey(Keys.DOM_VK_B, this.copyUserName, this, KeyHandler.SHORTCUT_ACTION, false, true);
        KeyHandler.onKey(Keys.DOM_VK_U, this.copyUrl, this, KeyHandler.SHORTCUT_ACTION, false, true);
        KeyHandler.onKey(Keys.DOM_VK_DELETE, this.deleteKeyPress, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_BACK_SPACE, this.deleteKeyPress, this, KeyHandler.SHORTCUT_ACTION);
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
        this.fieldViews.forEach(function(fieldView) { fieldView.remove(); });
        this.fieldViews = [];
        if (this.fieldCopyTip) {
            this.fieldCopyTip.hide();
            this.fieldCopyTip = null;
        }
    },

    render: function () {
        this.removeScroll();
        this.removeFieldViews();
        if (this.views.sub) {
            this.views.sub.remove();
            delete this.views.sub;
        }
        if (this.views.dropdownView) {
            this.views.dropdownView.remove();
            delete this.views.dropdownView;
        }
        if (!this.model) {
            this.$el.html(this.emptyTemplate());
            return;
        }
        if (this.model instanceof GroupModel) {
            this.$el.html(this.groupTemplate());
            Tip.createTips(this.$el);
            return;
        }
        var model = $.extend({ deleted: this.appModel.filter.trash }, this.model);
        this.$el.html(this.template(model));
        Tip.createTips(this.$el);
        this.setSelectedColor(this.model.color);
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
        var model = this.model;
        this.userEditView = new FieldViewAutocomplete({ model: { name: '$UserName', title: Locale.detUser,
            value: function() { return model.user; }, getCompletions: this.getUserNameCompletions.bind(this) } });
        this.fieldViews.push(this.userEditView);
        this.passEditView = new FieldViewText({ model: { name: '$Password', title: Locale.detPassword, canGen: true,
            value: function() { return model.password; } } });
        this.fieldViews.push(this.passEditView);
        this.urlEditView = new FieldViewUrl({ model: { name: '$URL', title: Locale.detWebsite,
            value: function() { return model.url; } } });
        this.fieldViews.push(this.urlEditView);
        this.fieldViews.push(new FieldViewText({ model: { name: '$Notes', title: Locale.detNotes, multiline: 'true',
            value: function() { return model.notes; } } }));
        this.fieldViews.push(new FieldViewTags({ model: { name: 'Tags', title: Locale.detTags, tags: this.appModel.tags,
            value: function() { return model.tags; } } }));
        this.fieldViews.push(new FieldViewDate({ model: { name: 'Expires', title: Locale.detExpires, lessThanNow: '(' + Locale.detExpired + ')',
            value: function() { return model.expires; } } }));
        this.fieldViews.push(new FieldViewReadOnly({ model: { name: 'File', title: Locale.detFile,
            value: function() { return model.fileName; } } }));
        this.fieldViews.push(new FieldViewReadOnly({ model: { name: 'Created', title: Locale.detCreated,
            value: function() { return Format.dtStr(model.created); } } }));
        this.fieldViews.push(new FieldViewReadOnly({ model: { name: 'Updated', title: Locale.detUpdated,
            value: function() { return Format.dtStr(model.updated); } } }));
        this.fieldViews.push(new FieldViewHistory({ model: { name: 'History', title: Locale.detHistory,
            value: function() { return { length: model.historyLength, unsaved: model.unsaved }; } } }));
        _.forEach(model.fields, function(value, field) {
            this.fieldViews.push(new FieldViewCustom({ model: { name: '$' + field, title: field,
                value: function() { return model.fields[field]; } } }));
        }, this);

        var hideEmptyFields = AppSettingsModel.instance.get('hideEmptyFields');

        var fieldsMainEl = this.$el.find('.details__body-fields');
        var fieldsAsideEl = this.$el.find('.details__body-aside');
        this.fieldViews.forEach(function(fieldView) {
            fieldView.setElement(fieldView.readonly ? fieldsAsideEl : fieldsMainEl).render();
            fieldView.on('change', this.fieldChanged.bind(this));
            fieldView.on('copy', this.fieldCopied.bind(this));
            if (hideEmptyFields) {
                var value = fieldView.model.value();
                if (!value || value.length === 0) {
                    if (this.model.isJustCreated && fieldView.model.name === '$UserName') {
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
        var newFieldTitle = Locale.detNetField;
        if (this.model.fields[newFieldTitle]) {
            for (var i = 1; ; i++) {
                var newFieldTitleVariant = newFieldTitle + i;
                if (!this.model.fields[newFieldTitleVariant]) {
                    newFieldTitle = newFieldTitleVariant;
                    break;
                }
            }
        }
        var fieldView = new FieldViewCustom({ model: { name: '$' + newFieldTitle, title: newFieldTitle, newField: newFieldTitle,
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
                var dropdownView = new DropdownView();
                this.listenTo(dropdownView, 'cancel', this.toggleMoreOptions);
                this.listenTo(dropdownView, 'select', this.moreOptionsSelect);
                var hideEmptyFields = AppSettingsModel.instance.get('hideEmptyFields');
                var moreOptions = [];
                if (hideEmptyFields) {
                    this.fieldViews.forEach(function(fieldView) {
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
                var rect = this.moreView.labelEl[0].getBoundingClientRect();
                dropdownView.render({
                    position: {top: rect.bottom, right: rect.right},
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
                var hideEmptyFields = AppSettingsModel.instance.get('hideEmptyFields');
                AppSettingsModel.instance.set('hideEmptyFields', !hideEmptyFields);
                this.render();
                break;
            default:
                if (e.item.lastIndexOf('add:', 0) === 0) {
                    var fieldName = e.item.substr(4);
                    var fieldView = _.find(this.fieldViews, function(f) { return f.model.name === fieldName; });
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
        var colorEl = this.$el.find('.details__header-color')[0];
        _.forEach(colorEl.classList, function(cls) {
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
        var color = $(e.target).closest('.details__colors-popup-item').data('color');
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
        var subView = new IconSelectView({
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
        var attBtn = $(e.target).closest('.details__attachment');
        var id = attBtn.data('id');
        var attachment = this.model.attachments[id];
        if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) {
            this.downloadAttachment(attachment);
            return;
        }
        if (this.views.sub && this.views.sub.attId === id) {
            this.render();
            return;
        }
        this.removeSubView();
        var subView = new DetailsAttachmentView({ el: this.scroller, model: attachment });
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
        var data = attachment.getBinary();
        if (!data) {
            return;
        }
        var mimeType = attachment.mimeType || 'application/octet-stream';
        var blob = new Blob([data], {type: mimeType});
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
        if (!window.getSelection().toString()) {
            var fieldValue = editView.value;
            var fieldText = fieldValue && fieldValue.isProtected ? fieldValue.getText() : fieldValue;
            if (!fieldText) {
                return;
            }
            if (!CopyPaste.simpleCopy) {
                CopyPaste.createHiddenInput(fieldText);
            }
            var copyRes = CopyPaste.copy(fieldText);
            if (copyRes) {
                this.fieldCopied({ source: editView, copyRes: copyRes });
            }
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
        var label = this.moreView.labelEl;
        var tip = new Tip(label, { title: Locale.detCopyHint, placement: 'right' });
        tip.show();
        setTimeout(function() { tip.hide(); }, Timeouts.AutoHideHint);
    },

    fieldChanged: function(e) {
        if (e.field) {
            if (e.field[0] === '$') {
                var fieldName = e.field.substr(1);
                if (e.newField) {
                    if (fieldName) {
                        this.model.setField(fieldName, undefined);
                    }
                    fieldName = e.newField;
                    var i = 0;
                    while (this.model.hasField(fieldName)) {
                        i++;
                        fieldName = e.newField + i;
                    }
                    this.model.setField(fieldName, e.val);
                    this.entryUpdated();
                    return;
                } else if (fieldName) {
                    this.model.setField(fieldName, e.val);
                }
            } else if (e.field === 'Tags') {
                this.model.setTags(e.val);
                this.appModel.updateTags();
            } else if (e.field === 'Expires') {
                var dt = e.val || undefined;
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

    fieldCopied: function(e) {
        if (this.fieldCopyTip) {
            this.fieldCopyTip.hide();
            this.fieldCopyTip = null;
        }
        var fieldLabel = e.source.labelEl;
        var clipboardTime = e.copyRes.seconds;
        var msg = clipboardTime ? Locale.detFieldCopiedTime.replace('{}', clipboardTime)
            : Locale.detFieldCopied;
        var tip;
        if (!this.isHidden()) {
            tip = new Tip(fieldLabel, {title: msg, placement: 'right', fast: true});
            this.fieldCopyTip = tip;
            tip.show();
        }
        var that = this;
        setTimeout(function() {
            if (tip) {
                tip.hide();
            }
            that.fieldCopyTip = null;
            if (e.source.model.name === '$Password' && AppSettingsModel.instance.get('lockOnCopy')) {
                setTimeout(function() {
                    Backbone.trigger('lock-workspace');
                }, Timeouts.BeforeAutoLock);
            }
        }, Timeouts.CopyTip);
    },

    dragover: function(e) {
        e.preventDefault();
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
        this.dragTimeout = setTimeout((function() {
            this.$el.find('.details').removeClass('details--drag');
            this.dragging = false;
        }).bind(this), 100);
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
        var files = e.target.files || e.originalEvent.dataTransfer.files;
        _.forEach(files, function(file) {
            var reader = new FileReader();
            reader.onload = (function() {
                this.addAttachment(file.name, reader.result);
            }).bind(this);
            reader.readAsArrayBuffer(file);
        }, this);
    },

    addAttachment: function(name, data) {
        this.model.addAttachment(name, data);
        this.entryUpdated();
    },

    deleteKeyPress: function() {
        if (this.views.sub && this.views.sub.attId !== undefined) {
            var attachment = this.model.attachments[this.views.sub.attId];
            this.model.removeAttachment(attachment.title);
            this.render();
        }
    },

    editTitle: function() {
        var input = $('<input/>')
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
        var code = e.keyCode || e.which;
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
        var newTitle = $('<h1 class="details__header-title"></h1>').text(title || '(no title)');
        this.$el.find('.details__header-title-input').replaceWith(newTitle);
    },

    entryUpdated: function(skipRender) {
        Backbone.trigger('entry-updated', { entry: this.model });
        if (!skipRender) {
            this.render();
        }
    },

    focusNextField: function(config) {
        var found = false, nextFieldView;
        if (config.field === '$Title' && !config.prev) {
            found = true;
        }
        var start = config.prev ? this.fieldViews.length - 1 : 0;
        var end = config.prev ? -1 : this.fieldViews.length;
        var inc = config.prev ? -1 : 1;
        for (var i = start; i !== end; i += inc) {
            var fieldView = this.fieldViews[i];
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
        var subView = new DetailsHistoryView({ el: this.scroller, model: this.model });
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

    deleteFromTrash: function() {
        Alerts.yesno({
            header: Locale.detDelFromTrash,
            body: Locale.detDelFromTrashBody + ' <p class="muted-color">' + Locale.detDelFromTrashBodyHint + '</p>',
            icon: 'minus-circle',
            success: (function() {
                this.model.deleteFromTrash();
                Backbone.trigger('refresh');
            }).bind(this)
        });
    },

    backClick: function() {
        Backbone.trigger('toggle-details', false);
    }
});

_.extend(DetailsView.prototype, Scrollable);

module.exports = DetailsView;
