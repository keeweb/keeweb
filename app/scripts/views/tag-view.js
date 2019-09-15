import Backbone from 'backbone';
import { View } from 'view-engine/view';
import { Alerts } from 'comp/ui/alerts';
import { Locale } from 'util/locale';
import template from 'templates/tag.hbs';

class TagView extends View {
    parent = '.app__panel';

    template = template;

    events = {
        'click .tag__buttons-trash': 'moveToTrash',
        'click .back-button': 'returnToApp',
        'click .tag__btn-rename': 'renameTag'
    };

    render() {
        if (this.tag) {
            super.render({
                title: this.tag.get('title')
            });
        }
    }

    showTag(tag) {
        this.tag = tag;
        this.render();
    }

    renameTag() {
        const title = $.trim(this.$el.find('#tag__field-title').val());
        if (!title || title === this.tag.get('title')) {
            return;
        }
        if (/[;,:]/.test(title)) {
            Alerts.error({
                header: Locale.tagBadName,
                body: Locale.tagBadNameBody.replace('{}', '`,`, `;`, `:`')
            });
            return;
        }
        if (this.model.tags.some(t => t.toLowerCase() === title.toLowerCase())) {
            Alerts.error({ header: Locale.tagExists, body: Locale.tagExistsBody });
            return;
        }
        this.model.renameTag(this.tag.get('title'), title);
        Backbone.trigger('select-all');
    }

    moveToTrash() {
        this.title = null;
        Alerts.yesno({
            header: Locale.tagTrashQuestion,
            body: Locale.tagTrashQuestionBody,
            success: () => {
                this.model.renameTag(this.tag.get('title'), undefined);
                Backbone.trigger('select-all');
            }
        });
    }

    returnToApp() {
        Backbone.trigger('edit-tag');
    }
}

export { TagView };
