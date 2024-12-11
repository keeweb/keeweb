import { View, DefaultTemplateOptions } from 'framework/views/view';
import { Events } from 'framework/events';
import { SearchResultCollection } from 'collections/search-result-collection';
import { DragDropInfo } from 'comp/app/drag-drop-info';
import { Alerts } from 'comp/ui/alerts';
import { AppSettingsModel } from 'models/app-settings-model';
import { EntryPresenter } from 'presenters/entry-presenter';
import { StringFormat } from 'util/formatting/string-format';
import { Locale } from 'util/locale';
import { Resizable } from 'framework/views/resizable';
import { Scrollable } from 'framework/views/scrollable';
import { DropdownView } from 'views/dropdown-view';
import { ListSearchView } from 'views/list-search-view';
import throttle from 'lodash/throttle';
import template from 'templates/list.hbs';
import emptyTemplate from 'templates/list-empty.hbs';

class ListView extends View {
    parent = '.app__list';

    template = template;

    emptyTemplate = emptyTemplate;

    events = {
        'click': 'click',
        'click .list__table-options': 'tableOptionsClick',
        'dragstart .list__item': 'itemDragStart'
    };

    minWidth = 200;
    minHeight = 200;
    maxWidth = 500;
    maxHeight = 500;

    itemsEl = null;

    tableColumns = [
        { val: 'title', name: 'title', enabled: true },
        { val: 'user', name: 'user', enabled: true },
        { val: 'url', name: 'website', enabled: true },
        { val: 'tags', name: 'tags', enabled: true },
        { val: 'notes', name: 'notes', enabled: true },
        { val: 'groupName', name: 'group', enabled: false },
        { val: 'fileName', name: 'file', enabled: false }
    ];

    constructor(model, options) {
        super(model, options);

        this.initScroll();
        this.views.search = new ListSearchView(this.model);

        this.listenTo(this.views.search, 'select-prev', this.selectPrev);
        this.listenTo(this.views.search, 'select-next', this.selectNext);
        this.listenTo(this.views.search, 'create-entry', this.createEntry);
        this.listenTo(this.views.search, 'create-group', this.createGroup);
        this.listenTo(this.views.search, 'create-template', this.createTemplate);
        this.listenTo(this, 'show', this.viewShown);
        this.listenTo(this, 'hide', this.viewHidden);
        this.listenTo(this, 'view-resize', this.viewResized);
        this.listenTo(Events, 'filter', this.filterChanged);
        this.listenTo(Events, 'entry-updated', this.entryUpdated);
        this.listenTo(Events, 'set-locale', this.render);

        this.listenTo(this.model.settings, 'change:tableView', this.setTableView);

        this.readTableColumnsEnabled();

        this.items = new SearchResultCollection();
        this.renderedItems = new Map();
    }

    render() {
        if (!this.isVisible()) {
            this.pendingRender = true;
            return;
        }
        this.pendingRender = false;

        if (!this.itemsEl) {
            super.render();
            this.itemsEl = this.$el.find('.list__items>.scroller');
            this.itemsEl.on('scroll', () => this.renderVisibleItems());
            this.views.search.render();
            this.setTableView();

            this.createScroll({
                root: this.$el.find('.list__items')[0],
                scroller: this.$el.find('.scroller')[0],
                bar: this.$el.find('.scroller__bar')[0]
            });
        }
        if (this.items.length) {
            const itemsTemplate = this.getItemsTemplate();
            const noColor = AppSettingsModel.colorfulIcons ? '' : 'grayscale';

            const presenter = new EntryPresenter(
                this.getDescField(),
                noColor,
                this.model.activeEntryId
            );
            const columns = {};
            this.tableColumns.forEach((col) => {
                if (col.enabled) {
                    columns[col.val] = true;
                }
            });
            presenter.columns = columns;
            this.presenter = presenter;

            presenter.present(this.items[0]);
            const itemTemplate = this.getItemTemplate();
            const itemsHtml = itemTemplate(presenter, DefaultTemplateOptions);
            presenter.reset();

            const html = itemsTemplate(
                { itemsHtml, columns: this.tableColumns },
                DefaultTemplateOptions
            );
            this.itemsEl.html(html);
            this.itemsContainerEl = this.itemsEl.find('.list__items-container:first')[0];

            const firstListItem = this.itemsContainerEl.firstElementChild;
            this.itemHeight = firstListItem.getBoundingClientRect().height;

            this.renderedItems = new Map([[0, firstListItem]]);

            const totalHeight = this.itemHeight * this.items.length;
            this.itemsContainerEl.style.minHeight = totalHeight + 'px';

            this.renderVisibleItems();
        } else {
            this.itemsEl.html(this.emptyTemplate({}, DefaultTemplateOptions));
        }
        this.pageResized();
    }

    getItemsTemplate() {
        if (this.model.settings.tableView) {
            return require('templates/list-mode-table.hbs');
        } else {
            return require('templates/list-mode-list.hbs');
        }
    }

    getItemTemplate() {
        if (this.model.settings.tableView) {
            return require('templates/list-item-table.hbs');
        } else {
            return require('templates/list-item-short.hbs');
        }
    }

    renderVisibleItems() {
        if (!this.isVisible()) {
            return;
        }

        const scrollEl = this.itemsEl[0];
        const rect = scrollEl.getBoundingClientRect();

        const pxTop = scrollEl.scrollTop;
        const pxHeight = rect.height;
        const itemHeight = this.itemHeight;
        const renderedItems = this.renderedItems;

        let firstIx = Math.max(0, Math.floor(pxTop / itemHeight));
        let lastIx = Math.min(this.items.length - 1, Math.ceil((pxTop + pxHeight) / itemHeight));

        const visibleCount = lastIx - firstIx;
        firstIx = Math.max(0, firstIx - visibleCount);
        lastIx = Math.min(this.items.length - 1, lastIx + visibleCount);

        const itemTemplate = this.getItemTemplate();
        const presenter = this.presenter;

        let itemsHtml = '';
        const renderedIndices = [];

        for (let ix = firstIx; ix <= lastIx; ix++) {
            const item = this.items[ix];
            if (renderedItems.has(ix)) {
                continue;
            }
            presenter.present(item);
            itemsHtml += itemTemplate(presenter, DefaultTemplateOptions);
            renderedIndices.push(ix);
        }
        presenter.reset();

        const tempEl = document.createElement('div');
        tempEl.innerHTML = itemsHtml;
        const renderedElements = [...tempEl.children];

        for (let i = 0; i < renderedElements.length; i++) {
            const el = renderedElements[i];
            const ix = renderedIndices[i];
            this.itemsContainerEl.append(el);
            el.style.top = ix * itemHeight + 'px';
            renderedItems.set(ix, el);
        }

        const maxRenderedItems = visibleCount * 6;

        if (renderedItems.size > maxRenderedItems) {
            for (const [ix, el] of this.renderedItems) {
                if (ix < firstIx || ix > lastIx) {
                    el.remove();
                    renderedItems.delete(ix);
                }
            }
        }
    }

    ensureItemRendered(ix) {
        if (this.renderedItems.has(ix)) {
            return;
        }

        const item = this.items[ix];
        const itemTemplate = this.getItemTemplate();

        this.presenter.present(item);
        const itemHtml = itemTemplate(this.presenter, DefaultTemplateOptions);
        this.presenter.reset();

        const tempEl = document.createElement('div');
        tempEl.innerHTML = itemHtml;

        const [el] = tempEl.children;

        this.itemsContainerEl.append(el);
        el.style.top = ix * this.itemHeight + 'px';

        this.renderedItems.set(ix, el);
    }

    getDescField() {
        return this.model.sort.replace('-', '');
    }

    click(e) {
        const listItemEl = e.target.closest('.list__item');
        if (!listItemEl) {
            return;
        }
        const id = listItemEl.id;
        const item = this.items.get(id);
        if (!item.active) {
            this.selectItem(item);
        }
        Events.emit('toggle-details', true);
    }

    selectPrev() {
        const ix = this.items.indexOf(this.items.get(this.model.activeEntryId));
        if (ix > 0) {
            this.selectItem(this.items[ix - 1]);
        }
    }

    selectNext() {
        const ix = this.items.indexOf(this.items.get(this.model.activeEntryId));
        if (ix < this.items.length - 1) {
            this.selectItem(this.items[ix + 1]);
        }
    }

    createEntry(arg) {
        const newEntry = this.model.createNewEntry(arg);
        this.items.unshift(newEntry);
        this.render();
        this.selectItem(newEntry);
        Events.emit('toggle-details', true);
    }

    createGroup() {
        const newGroup = this.model.createNewGroup();
        Events.emit('edit-group', newGroup);
    }

    createTemplate() {
        if (!this.model.settings.templateHelpShown) {
            Alerts.yesno({
                icon: 'note-sticky-o',
                header: Locale.listAddTemplateHeader,
                body:
                    Locale.listAddTemplateBody1.replace('{}', '"+"') +
                    '\n' +
                    Locale.listAddTemplateBody2.replace('{}', 'Templates'),
                buttons: [Alerts.buttons.ok, Alerts.buttons.cancel],
                success: () => {
                    this.model.settings.templateHelpShown = true;
                    this.createTemplate();
                }
            });
            return;
        }
        const templateEntry = this.model.createNewTemplateEntry();
        this.items.unshift(templateEntry);
        this.render();
        this.selectItem(templateEntry);
    }

    selectItem(item) {
        this.presenter.activeEntryId = item.id;
        this.model.activeEntryId = item.id;

        const ix = this.items.indexOf(item);
        this.ensureItemRendered(ix);

        Events.emit('entry-selected', item);
        this.itemsEl.find('.list__item--active').removeClass('list__item--active');
        const itemEl = document.getElementById(item.id);
        itemEl.classList.add('list__item--active');
        const listEl = this.itemsEl[0];
        const itemRect = itemEl.getBoundingClientRect();
        const listRect = listEl.getBoundingClientRect();
        if (itemRect.top < listRect.top) {
            listEl.scrollTop += itemRect.top - listRect.top;
        } else if (itemRect.bottom > listRect.bottom) {
            listEl.scrollTop += itemRect.bottom - listRect.bottom;
        }
    }

    viewShown() {
        this.views.search.show();
        if (this.pendingRender) {
            this.render();
        }
    }

    viewHidden() {
        this.views.search.hide();
    }

    setTableView() {
        const isTable = this.model.settings.tableView;
        this.dragView.setCoord(isTable ? 'y' : 'x');
        this.setDefaultSize();
    }

    setDefaultSize() {
        this.setSize(this.model.settings.listViewWidth);
    }

    setSize(size) {
        this.$el.css({ width: 'auto', height: 'auto' });
        if (size) {
            this.$el.css('flex', '0 0 ' + size + 'px');
        } else {
            this.$el.css('flex', '');
        }
    }

    viewResized(size) {
        this.setSize(size);
        this.throttleSetViewSizeSetting(size);
        this.renderVisibleItems();
    }

    throttleSetViewSizeSetting = throttle((size) => {
        AppSettingsModel.listViewWidth = size;
    }, 1000);

    filterChanged(filter) {
        this.items = filter.entries;
        this.renderedItems = new Map();
        this.render();
    }

    entryUpdated() {
        const scrollTop = this.itemsEl[0].scrollTop;
        this.render();
        this.itemsEl[0].scrollTop = scrollTop;
        this.renderVisibleItems();
    }

    itemDragStart(e) {
        e.stopPropagation();
        const id = $(e.target).closest('.list__item').attr('id');
        e.dataTransfer.setData('text/entry', id);
        e.dataTransfer.effectAllowed = 'move';
        DragDropInfo.dragObject = this.items.get(id);
    }

    tableOptionsClick(e) {
        e.stopImmediatePropagation();
        if (this.views.optionsDropdown) {
            this.hideOptionsDropdown();
            return;
        }
        const view = new DropdownView();
        this.listenTo(view, 'cancel', this.hideOptionsDropdown);
        this.listenTo(view, 'select', this.optionsDropdownSelect);
        const targetElRect = this.$el.find('.list__table-options')[0].getBoundingClientRect();
        const options = this.tableColumns.map((col) => ({
            value: col.val,
            icon: col.enabled ? 'square-check-o' : 'square-o',
            text: StringFormat.capFirst(Locale[col.name])
        }));
        view.render({
            position: {
                top: targetElRect.bottom,
                left: targetElRect.left
            },
            options
        });
        this.views.optionsDropdown = view;
    }

    hideOptionsDropdown() {
        if (this.views.optionsDropdown) {
            this.views.optionsDropdown.remove();
            delete this.views.optionsDropdown;
        }
    }

    optionsDropdownSelect(e) {
        const col = this.tableColumns.find((c) => c.val === e.item);
        col.enabled = !col.enabled;
        e.el.find('i:first').toggleClass('fa-square-check fa-square-o');
        this.render();
        this.saveTableColumnsEnabled();
    }

    readTableColumnsEnabled() {
        const tableViewColumns = AppSettingsModel.tableViewColumns;
        if (tableViewColumns && tableViewColumns.length) {
            this.tableColumns.forEach((col) => {
                col.enabled = tableViewColumns.indexOf(col.name) >= 0;
            });
        }
    }

    saveTableColumnsEnabled() {
        const tableViewColumns = this.tableColumns
            .filter((column) => column.enabled)
            .map((column) => column.name);
        AppSettingsModel.tableViewColumns = tableViewColumns;
    }
}

Object.assign(ListView.prototype, Resizable);
Object.assign(ListView.prototype, Scrollable);

export { ListView };
