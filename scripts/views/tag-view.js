import { Events } from 'framework/events';
import { View } from 'framework/views/view';
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
                title: this.tag.title
            });
        }
    }

    showTag(tag) {
        this.tag = tag;
        this.render();
    }

    renameTag() {
        const title = $.trim(this.$el.find('#tag__field-title').val());
        if (!title || title === this.tag.title) {
            return;
        }
        if (/[;,:]/.test(title)) {
            Alerts.error({
                header: Locale.tagBadName,
                body: Locale.tagBadNameBody.replace('{}', '`,`, `;`, `:`')
            });
            return;
        }
        if (this.model.tags.some((t) => t.toLowerCase() === title.toLowerCase())) {
            Alerts.error({ header: Locale.tagExists, body: Locale.tagExistsBody });
            return;
        }
        this.model.renameTag(this.tag.title, title);
        Events.emit('select-all');
    }

    moveToTrash() {
        this.title = null;
        Alerts.yesno({
            header: Locale.tagTrashQuestion,
            body: Locale.tagTrashQuestionBody,
            success: () => {
                this.model.renameTag(this.tag.title, undefined);
                Events.emit('select-all');
            }
        });
    }

    returnToApp() {
        Events.emit('edit-tag');
    }
}

export { TagView };
