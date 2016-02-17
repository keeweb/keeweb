'use strict';

var Backbone = require('backbone'),
    GroupModel = require('../../models/group-model'),
    AppSettingsModel = require('../../models/app-settings-model'),
    Scrollable = require('../../mixins/scrollable'),
    FieldViewText = require('../fields/field-view-text'),
    FieldViewDate = require('../fields/field-view-date'),
    FieldViewTags = require('../fields/field-view-tags'),
    FieldViewUrl = require('../fields/field-view-url'),
    FieldViewReadOnly = require('../fields/field-view-read-only'),
    FieldViewHistory = require('../fields/field-view-history'),
    FieldViewCustom = require('../fields/field-view-custom'),
    IconSelectView = require('../icon-select-view'),
    DetailsHistoryView = require('./details-history-view'),
    DetailsAttachmentView = require('./details-attachment-view'),
    Keys = require('../../const/keys'),
    KeyHandler = require('../../comp/key-handler'),
    Alerts = require('../../comp/alerts'),
    CopyPaste = require('../../comp/copy-paste'),
    Format = require('../../util/format'),
    Locale = require('../../util/locale'),
    Tip = require('../../util/tip'),
    Timeouts = require('../../const/timeouts'),
    FileSaver = require('filesaver'),
    kdbxweb = require('kdbxweb');

var DetailsView = Backbone.View.extend({
    template: require('templates/details/details.hbs'),
    emptyTemplate: require('templates/details/details-empty.hbs'),
    groupTemplate: require('templates/details/details-group.hbs'),

    fieldViews: null,
    views: null,
    passEditView: null,
    addNewFieldView: null,
    passCopyTip: null,

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
        KeyHandler.onKey(Keys.DOM_VK_C, this.copyKeyPress, this, KeyHandler.SHORTCUT_ACTION, false, true);
        KeyHandler.onKey(Keys.DOM_VK_DELETE, this.deleteKeyPress, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.onKey(Keys.DOM_VK_BACK_SPACE, this.deleteKeyPress, this, KeyHandler.SHORTCUT_ACTION);
    },

    remove: function() {
        KeyHandler.offKey(Keys.DOM_VK_C, this.copyKeyPress, this);
        KeyHandler.offKey(Keys.DOM_VK_DELETE, this.deleteKeyPress, this, KeyHandler.SHORTCUT_ACTION);
        KeyHandler.offKey(Keys.DOM_VK_BACK_SPACE, this.deleteKeyPress, this, KeyHandler.SHORTCUT_ACTION);
        this.removeFieldViews();
        Backbone.View.prototype.remove.call(this);
    },

    removeFieldViews: function() {
        this.fieldViews.forEach(function(fieldView) { fieldView.remove(); });
        this.fieldViews = [];
        if (this.passCopyTip) {
            this.passCopyTip.hide();
            this.passCopyTip = null;
        }
    },

    render: function () {
        this.removeScroll();
        this.removeFieldViews();
        if (this.views.sub) {
            this.views.sub.remove();
            delete this.views.sub;
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
        this.fieldViews.push(new FieldViewText({ model: { name: '$UserName', title: Locale.detUser,
            value: function() { return model.user; } } }));
        this.passEditView = new FieldViewText({ model: { name: '$Password', title: Locale.detPassword, canGen: true,
            value: function() { return model.password; } } });
        this.fieldViews.push(this.passEditView);
        this.fieldViews.push(new FieldViewUrl({ model: { name: '$URL', title: Locale.detWebsite,
            value: function() { return model.url; } } }));
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
        var newFieldTitle = Locale.detNetField;
        if (model.fields[newFieldTitle]) {
            for (var i = 1; ; i++) {
                var newFieldTitleVariant = newFieldTitle + i;
                if (!model.fields[newFieldTitleVariant]) {
                    newFieldTitle = newFieldTitleVariant;
                    break;
                }
            }
        }
        this.addNewFieldView = new FieldViewCustom({ model: { name: '$', title: Locale.detAddField, newField: newFieldTitle,
            value: function() { return ''; } } });
        this.fieldViews.push(this.addNewFieldView);

        var fieldsMainEl = this.$el.find('.details__body-fields');
        var fieldsAsideEl = this.$el.find('.details__body-aside');
        this.fieldViews.forEach(function(fieldView) {
            fieldView.setElement(fieldView.readonly ? fieldsAsideEl : fieldsMainEl).render();
            fieldView.on('change', this.fieldChanged.bind(this));
        }, this);
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

    copyKeyPress: function() { // TODO: fix this in Safari
        if (!window.getSelection().toString()) {
            var pw = this.model.password;
            var password = pw.isProtected ? pw.getText() : pw;
            if (!CopyPaste.simpleCopy) {
                CopyPaste.createHiddenInput(password);
            }
            var copyRes = CopyPaste.copy(password);
            if (copyRes && !this.passCopyTip) {
                var passLabel = this.passEditView.labelEl;
                var clipboardTime = copyRes.seconds;
                var msg = clipboardTime ? Locale.detPassCopiedTime.replace('{}', clipboardTime)
                    : Locale.detPassCopied;
                var tip = new Tip(passLabel, { title: msg, placement: 'right', fast: true });
                this.passCopyTip = tip;
                tip.show();
                var that = this;
                setTimeout(function() {
                    tip.hide();
                    that.passCopyTip = null;
                }, Timeouts.CopyTip);
            }
        }
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
        var newFieldLabel = this.addNewFieldView.labelEl;
        var tip = new Tip(newFieldLabel, { title: Locale.detCopyHint, placement: 'right' });
        tip.show();
        setTimeout(function() { tip.hide(); }, Timeouts.AutoHideHint);
    },

    fieldChanged: function(e) {
        if (e.field) {
            if (e.field[0] === '$') {
                var fieldName = e.field.substr(1);
                if (e.newField && e.newField !== fieldName) {
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
        }
        if (e.tab) {
            this.focusNextField(e.tab);
        }
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
            } else if (found && !fieldView.readonly) {
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
