const Backbone = require('backbone');
const FeatureDetector = require('../util/feature-detector');
const Links = require('../const/links');
const Timeouts = require('../const/timeouts');

const AutoTypeHintView = Backbone.View.extend({
    template: require('templates/auto-type-hint.hbs'),

    events: {},

    initialize: function(opts) {
        this.input = opts.input;
        this.bodyClick = this.bodyClick.bind(this);
        this.inputBlur = this.inputBlur.bind(this);
        $('body').on('click', this.bodyClick);
        this.input.addEventListener('blur', this.inputBlur);
    },

    render: function () {
        this.renderTemplate({
            cmd: FeatureDetector.isMac ? 'command' : 'ctrl',
            hasCtrl: FeatureDetector.isMac,
            link: Links.AutoType
        });
        const rect = this.input.getBoundingClientRect();
        this.$el.appendTo(document.body).css({
            left: rect.left, top: rect.bottom + 1, width: rect.width
        });
        const selfRect = this.$el[0].getBoundingClientRect();
        const bodyRect = document.body.getBoundingClientRect();
        if (selfRect.bottom > bodyRect.bottom) {
            this.$el.css('height', selfRect.height + bodyRect.bottom - selfRect.bottom - 1);
        }
        return this;
    },

    remove: function() {
        $('body').off('click', this.bodyClick);
        this.input.removeEventListener('blur', this.inputBlur);
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    bodyClick: function(e) {
        if (this.removeTimer) {
            clearTimeout(this.removeTimer);
            this.removeTimer = null;
        }
        if (e.target === this.input) {
            e.stopPropagation();
            return;
        }
        if ($.contains(this.$el[0], e.target) || e.target === this.$el[0]) {
            e.stopPropagation();
            if (e.target.tagName.toLowerCase() === 'a' && !e.target.href) {
                let text = $(e.target).text();
                if (text[0] !== '{') {
                    text = text.split(' ')[0];
                }
                this.insertText(text);
            }
            this.input.focus();
        } else {
            this.remove();
        }
    },

    inputBlur: function() {
        if (!this.removeTimer) {
            this.removeTimer = setTimeout(this.remove.bind(this), Timeouts.DropDownClickWait);
        }
    },

    insertText: function(text) {
        const pos = this.input.selectionEnd || this.input.value.length;
        this.input.value = this.input.value.substr(0, pos) + text + this.input.value.substr(pos);
        this.input.selectionStart = this.input.selectionEnd = pos + text.length;
        $(this.input).trigger('input');
    }
});

module.exports = AutoTypeHintView;
