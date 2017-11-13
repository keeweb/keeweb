const Backbone = require('backbone');
const IconMap = require('../const/icon-map');
const Launcher = require('../comp/launcher');
const Logger = require('../util/logger');

const logger = new Logger('icon-select-view');

const IconSelectView = Backbone.View.extend({
    template: require('templates/icon-select.hbs'),

    events: {
        'click .icon-select__icon': 'iconClick',
        'click .icon-select__icon-download': 'downloadIcon',
        'click .icon-select__icon-select': 'selectIcon',
        'change .icon-select__file-input': 'iconSelected'
    },

    initialize: function() {
        this.special = {
            select: null,
            download: null
        };
    },

    render: function() {
        this.renderTemplate({
            sel: this.model.iconId,
            icons: IconMap,
            canDownloadFavicon: !!this.model.url,
            customIcons: this.model.file.getCustomIcons()
        }, true);
        return this;
    },

    iconClick: function(e) {
        const target = $(e.target).closest('.icon-select__icon');
        const iconId = target[0].getAttribute('data-val');
        if (iconId === 'special') {
            const iconData = this.special[target.data('special')];
            if (iconData) {
                const id = this.model.file.addCustomIcon(iconData.data);
                this.trigger('select', { id: id, custom: true });
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        } else if (iconId) {
            const isCustomIcon = target.hasClass('icon-select__icon-custom');
            this.trigger('select', { id: iconId, custom: isCustomIcon });
        }
    },

    downloadIcon: function() {
        if (this.downloadingFavicon) {
            return;
        }
        this.downloadingFavicon = true;
        this.$el.find('.icon-select__icon-download>i').addClass('fa-spinner fa-spin');
        this.$el.find('.icon-select__icon-download').removeClass('icon-select__icon--download-error');
        const url = this.getIconUrl(!Launcher); // inside launcher we can load images without CORS
        const img = document.createElement('img');
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            this.setSpecialImage(img, 'download');
            this.$el.find('.icon-select__icon-download img').remove();
            this.$el.find('.icon-select__icon-download>i').removeClass('fa-spinner fa-spin');
            this.$el.find('.icon-select__icon-download').addClass('icon-select__icon--custom-selected').append(img);
            this.downloadingFavicon = false;
        };
        img.onerror = e => {
            logger.error('Favicon download error: ' + url, e);
            this.$el.find('.icon-select__icon-download>i').removeClass('fa-spinner fa-spin');
            this.$el.find('.icon-select__icon-download')
                .removeClass('icon-select__icon--custom-selected')
                .addClass('icon-select__icon--download-error');
            this.downloadingFavicon = false;
        };
    },

    getIconUrl: function(useService) {
        if (!this.model.url) {
            return null;
        }
        let url = this.model.url.replace(/([^\/:]\/.*)?$/, match => (match && match[0]) + '/favicon.ico');
        if (url.indexOf('://') < 0) {
            url = 'http://' + url;
        }
        if (useService) {
            return 'https://favicon.keeweb.info/' + url.replace(/^.*:\/+/, '').replace(/\/.*/, '');
        }
        return url;
    },

    selectIcon: function() {
        this.$el.find('.icon-select__file-input').click();
    },

    iconSelected: function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.createElement('img');
                img.onload = () => {
                    this.setSpecialImage(img, 'select');
                    this.$el.find('.icon-select__icon-select img').remove();
                    this.$el.find('.icon-select__icon-select').addClass('icon-select__icon--custom-selected').append(img);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            this.$el.find('.icon-select__icon-select img').remove();
            this.$el.find('.icon-select__icon-select').removeClass('icon-select__icon--custom-selected');
        }
    },

    setSpecialImage: function(img, name) {
        const size = Math.min(img.width, 32);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = canvas.toDataURL().replace(/^.*,/, '');
        this.special[name] = { width: img.width, height: img.height, data: data };
    }
});

module.exports = IconSelectView;
