import { View } from 'framework/views/view';
import { Shortcuts } from 'comp/app/shortcuts';
import template from 'templates/details/details-attachment.hbs';

class DetailsAttachmentView extends View {
    template = template;

    events = {};

    render(complete) {
        super.render();
        const shortcut = this.$el.find('.details__attachment-preview-download-text-shortcut');
        shortcut.html(Shortcuts.actionShortcutSymbol(false));
        const blob = new Blob([this.model.getBinary()], { type: this.model.mimeType });
        const dataEl = this.$el.find('.details__attachment-preview-data');
        switch ((this.model.mimeType || '').split('/')[0]) {
            case 'text': {
                const reader = new FileReader();
                reader.addEventListener('loadend', () => {
                    $('<pre/>')
                        .text(reader.result)
                        .appendTo(dataEl);
                    complete();
                });
                reader.readAsText(blob);
                return;
            }
            case 'image':
                $('<img/>')
                    .attr('src', URL.createObjectURL(blob))
                    .appendTo(dataEl);
                complete();
                return;
        }
        this.$el.addClass('details__attachment-preview--empty');
        this.$el.find('.details__attachment-preview-icon').addClass('fa-' + this.model.icon);
        complete();
    }
}

export { DetailsAttachmentView };
