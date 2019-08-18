const Backbone = require('backbone');

const DropdownView = Backbone.View.extend({
    template: require('templates/dropdown.hbs'),

    events: {
        'click .dropdown__item': 'itemClick'
    },

    initialize() {
        this.bodyClick = this.bodyClick.bind(this);
        this.listenTo(Backbone, 'show-context-menu', this.bodyClick);
        $('body').on('click contextmenu keyup', this.bodyClick);
    },

    render(config) {
        this.options = config.options;
        this.renderTemplate(config);
        this.$el.appendTo(document.body);
        const ownRect = this.$el[0].getBoundingClientRect();
        const bodyRect = document.body.getBoundingClientRect();
        let left = config.position.left || config.position.right - ownRect.right + ownRect.left;
        let top = config.position.top;
        if (left + ownRect.width > bodyRect.right) {
            left = Math.max(0, bodyRect.right - ownRect.width);
        }
        if (top + ownRect.height > bodyRect.bottom) {
            top = Math.max(0, bodyRect.bottom - ownRect.height);
        }
        this.$el.css({ top, left });
        return this;
    },

    remove() {
        this.viewRemoved = true;
        $('body').off('click contextmenu keyup', this.bodyClick);
        Backbone.View.prototype.remove.apply(this);
    },

    bodyClick() {
        if (!this.viewRemoved) {
            this.trigger('cancel');
        }
    },

    itemClick(e) {
        e.stopPropagation();
        const el = $(e.target).closest('.dropdown__item');
        const selected = el.data('value');
        this.trigger('select', { item: selected, el });
    }
});

module.exports = DropdownView;
