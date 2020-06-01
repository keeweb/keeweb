import { Model } from 'framework/model';
import { Events } from 'framework/events';
import { MenuSectionCollection } from 'collections/menu/menu-section-collection';
import { Colors } from 'const/colors';
import { Keys } from 'const/keys';
import { GroupsMenuModel } from 'models/menu/groups-menu-model';
import { MenuSectionModel } from 'models/menu/menu-section-model';
import { StringFormat } from 'util/formatting/string-format';
import { Locale } from 'util/locale';
import { Launcher } from 'comp/launcher';

class MenuModel extends Model {
    constructor() {
        super();
        this.menus = {};
        this.allItemsSection = new MenuSectionModel([
            {
                locTitle: 'menuAllItems',
                icon: 'th-large',
                active: true,
                shortcut: Keys.DOM_VK_A,
                filterKey: '*'
            }
        ]);
        this.allItemsItem = this.allItemsSection.items[0];
        this.groupsSection = new GroupsMenuModel();
        this.colorsSection = new MenuSectionModel([
            {
                locTitle: 'menuColors',
                icon: 'bookmark',
                shortcut: Keys.DOM_VK_C,
                cls: 'menu__item-colors',
                filterKey: 'color',
                filterValue: true
            }
        ]);
        this.colorsItem = this.colorsSection.items[0];
        const defTags = [this._getDefaultTagItem()];
        this.tagsSection = new MenuSectionModel(defTags);
        this.tagsSection.set({ scrollable: true, drag: true });
        this.tagsSection.defaultItems = defTags;
        this.trashSection = new MenuSectionModel([
            {
                locTitle: 'menuTrash',
                icon: 'trash',
                shortcut: Keys.DOM_VK_D,
                filterKey: 'trash',
                filterValue: true,
                drop: true
            }
        ]);
        Colors.AllColors.forEach((color) => {
            const option = {
                cls: 'fa ' + color + '-color',
                value: color,
                filterValue: color
            };
            this.colorsSection.items[0].addOption(option);
        });
        this.menus.app = new MenuSectionCollection([
            this.allItemsSection,
            this.colorsSection,
            this.tagsSection,
            this.groupsSection,
            this.trashSection
        ]);

        this.generalSection = new MenuSectionModel([
            { locTitle: 'menuSetGeneral', icon: 'cog', page: 'general', active: true }
        ]);
        this.shortcutsSection = new MenuSectionModel([
            { locTitle: 'shortcuts', icon: 'keyboard-o', page: 'shortcuts' }
        ]);
        this.pluginsSection = new MenuSectionModel([
            { locTitle: 'plugins', icon: 'puzzle-piece', page: 'plugins' }
        ]);
        if (Launcher) {
            this.devicesSection = new MenuSectionModel([
                { locTitle: 'menuSetDevices', icon: 'usb', page: 'devices' }
            ]);
        }
        this.aboutSection = new MenuSectionModel([
            { locTitle: 'menuSetAbout', icon: 'info', page: 'about' }
        ]);
        this.helpSection = new MenuSectionModel([
            { locTitle: 'help', icon: 'question', page: 'help' }
        ]);
        this.filesSection = new MenuSectionModel();
        this.filesSection.set({ scrollable: true, grow: true });
        this.menus.settings = new MenuSectionCollection(
            [
                this.generalSection,
                this.shortcutsSection,
                this.pluginsSection,
                this.devicesSection,
                this.aboutSection,
                this.helpSection,
                this.filesSection
            ].filter((s) => s)
        );
        this.sections = this.menus.app;

        Events.on('set-locale', this._setLocale.bind(this));
        Events.on('select-next-menu-item', this._selectNext.bind(this));
        Events.on('select-previous-menu-item', this._selectPrevious.bind(this));

        this._setLocale();
    }

    select(sel) {
        const sections = this.sections;
        for (const section of sections) {
            this._select(section, sel.item);
        }
        if (sections === this.menus.app) {
            this.colorsItem.options.forEach((opt) => {
                opt.active = opt === sel.option;
            });
            const selColor =
                sel.item === this.colorsItem && sel.option ? sel.option.value + '-color' : '';
            this.colorsItem.cls = 'menu__item-colors ' + selColor;
            const filterKey = sel.item.filterKey;
            const filterValue = (sel.option || sel.item).filterValue;
            const filter = {};
            filter[filterKey] = filterValue;
            Events.emit('set-filter', filter);
        } else if (sections === this.menus.settings) {
            Events.emit('set-page', {
                page: sel.item.page,
                file: sel.item.file
            });
        }
    }

    _selectPrevious() {
        let previousItem = null;

        const processSection = (section) => {
            if (section.visible === false) {
                return true;
            }
            if (section.active) {
                previousItem = section;
            }
            const items = section.items;
            if (items) {
                items.forEach((it) => {
                    if (it.active && previousItem) {
                        this.select({ item: previousItem });
                        return false;
                    }
                    return processSection(it);
                });
            }
        };

        const sections = this.sections;
        sections.forEach((section) => processSection(section));
    }

    _selectNext() {
        let activeItem = null;

        const processSection = (section) => {
            if (section.visible === false) {
                return true;
            }
            if (section.active && activeItem && section !== activeItem) {
                this.select({ item: section });
                activeItem = null;
                return false;
            }
            const items = section.items;
            if (items) {
                items.forEach((it) => {
                    if (it.active) {
                        activeItem = it;
                    }
                    return processSection(it);
                });
            }
        };

        const sections = this.sections;
        sections.forEach((section) => processSection(section));
    }

    _select(item, selectedItem) {
        const items = item.items;
        if (items) {
            for (const it of items) {
                it.active = it === selectedItem;
                this._select(it, selectedItem);
            }
        }
    }

    _setLocale() {
        for (const menu of [this.menus.app, this.menus.settings]) {
            for (const section of menu) {
                for (const item of section.items) {
                    if (item.locTitle) {
                        item.title = StringFormat.capFirst(Locale[item.locTitle]);
                    }
                }
            }
        }
        this.tagsSection.defaultItems[0] = this._getDefaultTagItem();
    }

    _getDefaultTagItem() {
        return {
            title: StringFormat.capFirst(Locale.tags),
            icon: 'tags',
            defaultItem: true,
            disabled: {
                header: Locale.menuAlertNoTags,
                body: Locale.menuAlertNoTagsBody,
                icon: 'tags'
            }
        };
    }

    setMenu(type) {
        this.sections = this.menus[type];
    }
}

MenuModel.defineModelProperties(
    {
        sections: null,
        menu: null
    },
    { extensions: true }
);

export { MenuModel };
