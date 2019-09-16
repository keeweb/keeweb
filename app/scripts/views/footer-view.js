import Backbone from 'backbone';
import { View } from 'framework/views/view';
import { KeyHandler } from 'comp/browser/key-handler';
import { Keys } from 'const/keys';
import { UpdateModel } from 'models/update-model';
import { GeneratorView } from 'views/generator-view';
import template from 'templates/footer.hbs';

class FooterView extends View {
    parent = '.app__footer';

    template = template;

    events = {
        'click .footer__db-item': 'showFile',
        'click .footer__db-open': 'openFile',
        'click .footer__btn-help': 'toggleHelp',
        'click .footer__btn-settings': 'toggleSettings',
        'click .footer__btn-generate': 'genPass',
        'click .footer__btn-lock': 'lockWorkspace'
    };

    constructor(model, options) {
        super(model, options);

        this.onKey(Keys.DOM_VK_L, this.lockWorkspace, KeyHandler.SHORTCUT_ACTION, false, true);
        this.onKey(Keys.DOM_VK_G, this.genPass, KeyHandler.SHORTCUT_ACTION);
        this.onKey(Keys.DOM_VK_O, this.openFile, KeyHandler.SHORTCUT_ACTION);
        this.onKey(Keys.DOM_VK_S, this.saveAll, KeyHandler.SHORTCUT_ACTION);
        this.onKey(Keys.DOM_VK_COMMA, this.toggleSettings, KeyHandler.SHORTCUT_ACTION);

        this.listenTo(this, 'hide', this.viewHidden);
        this.listenTo(this.model.files, 'update reset change', this.render);
        this.listenTo(Backbone, 'set-locale', this.render);
        this.listenTo(UpdateModel.instance, 'change:updateStatus', this.render);
    }

    render() {
        super.render({
            files: this.model.files,
            updateAvailable:
                ['ready', 'found'].indexOf(UpdateModel.instance.get('updateStatus')) >= 0
        });
    }

    viewHidden() {
        if (this.views.gen) {
            this.views.gen.remove();
            delete this.views.gen;
        }
    }

    lockWorkspace(e) {
        if (this.model.files.hasOpenFiles()) {
            e.preventDefault();
            Backbone.trigger('lock-workspace');
        }
    }

    genPass(e) {
        e.stopPropagation();
        if (this.views.gen) {
            this.views.gen.remove();
            return;
        }
        const el = this.$el.find('.footer__btn-generate');
        const rect = el[0].getBoundingClientRect();
        const bodyRect = document.body.getBoundingClientRect();
        const right = bodyRect.right - rect.right;
        const bottom = bodyRect.bottom - rect.top;
        const generator = new GeneratorView({ copy: true, pos: { right, bottom } });
        generator.render();
        generator.once('remove', () => {
            delete this.views.gen;
        });
        this.views.gen = generator;
    }

    showFile(e) {
        const fileId = $(e.target)
            .closest('.footer__db-item')
            .data('file-id');
        if (fileId) {
            Backbone.trigger('show-file', { fileId });
        }
    }

    openFile() {
        Backbone.trigger('open-file');
    }

    saveAll() {
        Backbone.trigger('save-all');
    }

    toggleHelp() {
        Backbone.trigger('toggle-settings', 'help');
    }

    toggleSettings() {
        Backbone.trigger('toggle-settings', 'general');
    }
}

export { FooterView };
