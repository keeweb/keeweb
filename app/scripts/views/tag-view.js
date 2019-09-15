const Backbone = require('backbone');
const Locale = require('../util/locale');
const Alerts = require('../comp/ui/alerts');

const TagView = Backbone.View.extend({
    template: require('templates/tag.hbs'),

    events: {
        'click .tag__buttons-trash': 'moveToTrash',
        'click .back-button': 'returnToApp',
        'click .tag__btn-rename': 'renameTag'
    },

    initialize() {
        this.appModel = this.model;
    },

    render() {
        if (this.model) {
            this.renderTemplate(
                {
                    title: this.model.get('title')
                },
                true
            );
        }
        return this;
    },

    showTag(tag) {
        this.model = tag;
        this.render();
    },

    renameTag() {
        const title = $.trim(this.$el.find('#tag__field-title').val());
        if (!title || title === this.model.get('title')) {
            return;
        }
        if (/[;,:]/.test(title)) {
            Alerts.error({
                header: Locale.tagBadName,
                body: Locale.tagBadNameBody.replace('{}', '`,`, `;`, `:`')
            });
            return;
        }
        if (this.appModel.tags.some(t => t.toLowerCase() === title.toLowerCase())) {
            Alerts.error({ header: Locale.tagExists, body: Locale.tagExistsBody });
            return;
        }
        this.appModel.renameTag(this.model.get('title'), title);
        Backbone.trigger('select-all');
    },

    moveToTrash() {
        this.title = null;
        Alerts.yesno({
            header: Locale.tagTrashQuestion,
            body: Locale.tagTrashQuestionBody,
            success: () => {
                this.appModel.renameTag(this.model.get('title'), undefined);
                Backbone.trigger('select-all');
            }
        });
    },

    returnToApp() {
        Backbone.trigger('edit-tag');
    }
});

module.exports = TagView;
