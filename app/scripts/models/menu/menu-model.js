'use strict';

var Backbone = require('backbone'),
    MenuSectionCollection = require('../../collections/menu/menu-section-collection'),
    MenuSectionModel = require('./menu-section-model'),
    GroupsMenuModel = require('./groups-menu-model'),
    Locale = require('../../util/locale'),
    Keys = require('../../const/keys'),
    Colors = require('../../const/colors');

var MenuModel = Backbone.Model.extend({
    defaults: {
        sections: null
    },

    menus: null,

    initialize: function() {
        this.menus = {};
        this.allItemsSection = new MenuSectionModel([{ title: Locale.menuAllItems, icon: 'th-large', active: true,
            shortcut: Keys.DOM_VK_A, filterKey: '*' }]);
        this.groupsSection = new GroupsMenuModel();
        this.colorsSection = new MenuSectionModel([{ title: Locale.menuColors, icon: 'bookmark', shortcut: Keys.DOM_VK_C,
            cls: 'menu__item-colors', filterKey: 'color', filterValue: true }]);
        this.colorsItem = this.colorsSection.get('items').models[0];
        var defTags = [{ title: Locale.menuTags, icon: 'tags', defaultItem: true,
            disabled: { header: Locale.menuAlertNoTags, body: Locale.menuAlertNoTagsBody, icon: 'tags' } }];
        this.tagsSection = new MenuSectionModel(defTags);
        this.tagsSection.set({ scrollable: true, drag: true });
        this.tagsSection.defaultItems = defTags;
        this.trashSection = new MenuSectionModel([{ title: Locale.menuTrash, icon: 'trash', shortcut: Keys.DOM_VK_D,
            filterKey: 'trash', filterValue: true, drop: true }]);
        Colors.AllColors.forEach(function(color) { this.colorsSection.get('items').models[0]
            .addOption({ cls: 'fa ' + color + '-color', value: color, filterValue: color }); }, this);
        this.menus.app = new MenuSectionCollection([
            this.allItemsSection,
            this.colorsSection,
            this.tagsSection,
            this.groupsSection,
            this.trashSection
        ]);

        this.generalSection = new MenuSectionModel([{ title: Locale.menuSetGeneral, icon: 'cog', page: 'general', active: true }]);
        this.shortcutsSection = new MenuSectionModel([{ title: Locale.menuSetShortcuts, icon: 'keyboard-o', page: 'shortcuts' }]);
        this.aboutSection = new MenuSectionModel([{ title: Locale.menuSetAbout, icon: 'info', page: 'about' }]);
        this.helpSection = new MenuSectionModel([{ title: Locale.menuSetHelp, icon: 'question', page: 'help' }]);
        this.filesSection = new MenuSectionModel();
        this.filesSection.set({ scrollable: true, grow: true });
        this.menus.settings = new MenuSectionCollection([
            this.generalSection,
            this.shortcutsSection,
            this.aboutSection,
            this.helpSection,
            this.filesSection
        ]);
        this.set('sections', this.menus.app);
    },

    select: function(sel) {
        var sections = this.get('sections');
        sections.forEach(function(section) { this._select(section, sel.item); }, this);
        if (sections === this.menus.app) {
            this.colorsItem.get('options').forEach(function (opt) {
                opt.set('active', opt === sel.option);
            });
            var selColor = sel.item === this.colorsItem && sel.option ? sel.option.get('value') + '-color' : '';
            this.colorsItem.set('cls', 'menu__item-colors ' + selColor);
            var filterKey = sel.item.get('filterKey'),
                filterValue = (sel.option || sel.item).get('filterValue');
            var filter = {};
            filter[filterKey] = filterValue;
            Backbone.trigger('set-filter', filter);
        } else if (sections === this.menus.settings) {
            Backbone.trigger('set-page', { page: sel.item.get('page'), file: sel.item.get('file') });
        }
    },

    _select: function(item, selectedItem) {
        var items = item.get('items');
        if (items) {
            items.forEach(function(it) {
                it.set('active', it === selectedItem);
                this._select(it, selectedItem);
            }, this);
        }
    },

    setMenu: function(type) {
        this.set('sections', this.menus[type]);
    }
});

module.exports = MenuModel;
