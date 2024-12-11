import { View } from 'framework/views/view';
import { Events } from 'framework/events';
import { AutoType } from 'auto-type';
import { Scrollable } from 'framework/views/scrollable';
import { AutoTypeHintView } from 'views/auto-type/auto-type-hint-view';
import { IconSelectView } from 'views/icon-select-view';
import template from 'templates/grp.hbs';

class GrpView extends View {
    parent = '.app__panel';

    template = template;

    events = {
        'click .grp__icon': 'showIconsSelect',
        'click .grp__buttons-trash': 'moveToTrash',
        'click .back-button': 'returnToApp',
        'input #grp__field-title': 'changeTitle',
        'focus #grp__field-auto-type-seq': 'focusAutoTypeSeq',
        'input #grp__field-auto-type-seq': 'changeAutoTypeSeq',
        'change #grp__check-search': 'setEnableSearching',
        'change #grp__check-auto-type': 'setEnableAutoType'
    };

    render() {
        this.removeSubView();
        super.render({
            title: this.model.title,
            icon: this.model.icon || 'folder',
            customIcon: this.model.customIcon,
            enableSearching: this.model.getEffectiveEnableSearching(),
            readonly: this.model.top,
            canAutoType: AutoType.enabled,
            autoTypeSeq: this.model.autoTypeSeq,
            autoTypeEnabled: this.model.getEffectiveEnableAutoType(),
            defaultAutoTypeSeq: this.model.getParentEffectiveAutoTypeSeq()
        });
        if (!this.model.title) {
            this.$el.find('#grp__field-title').trigger('focus');
        }
        this.createScroll({
            root: this.$el.find('.grp')[0],
            scroller: this.$el.find('.scroller')[0],
            bar: this.$el.find('.scroller__bar')[0]
        });
        this.pageResized();
    }

    removeSubView() {
        if (this.views.sub) {
            this.views.sub.remove();
            delete this.views.sub;
        }
    }

    changeTitle(e) {
        const title = $.trim(e.target.value);
        if (title) {
            if (!this.model.top && title !== this.model.title) {
                this.model.setName(title);
            }
        } else {
            if (this.model.isJustCreated) {
                this.model.removeWithoutHistory();
                Events.emit('edit-group');
            }
        }
    }

    changeAutoTypeSeq(e) {
        const el = e.target;
        const seq = $.trim(el.value);
        AutoType.validate(null, seq, (err) => {
            $(e.target).toggleClass('input--error', !!err);
            if (!err) {
                this.model.setAutoTypeSeq(seq);
            }
        });
    }

    focusAutoTypeSeq(e) {
        if (!this.views.hint) {
            this.views.hint = new AutoTypeHintView({ input: e.target });
            this.views.hint.render();
            this.views.hint.on('remove', () => {
                delete this.views.hint;
            });
        }
    }

    showIconsSelect() {
        if (this.views.sub) {
            this.removeSubView();
        } else {
            const subView = new IconSelectView(
                {
                    iconId: this.model.customIconId || this.model.iconId,
                    file: this.model.file
                },
                {
                    parent: this.$el.find('.grp__icons')[0]
                }
            );
            this.listenTo(subView, 'select', this.iconSelected);
            subView.render();
            this.views.sub = subView;
        }
        this.pageResized();
    }

    iconSelected(sel) {
        if (sel.custom) {
            if (sel.id !== this.model.customIconId) {
                this.model.setCustomIcon(sel.id);
            }
        } else if (sel.id !== this.model.iconId) {
            this.model.setIcon(+sel.id);
        }
        this.render();
    }

    moveToTrash() {
        this.model.moveToTrash();
        Events.emit('select-all');
    }

    setEnableSearching(e) {
        const enabled = e.target.checked;
        this.model.setEnableSearching(enabled);
    }

    setEnableAutoType(e) {
        const enabled = e.target.checked;
        this.model.setEnableAutoType(enabled);
    }

    returnToApp() {
        Events.emit('edit-group');
    }
}

Object.assign(GrpView.prototype, Scrollable);

export { GrpView };
