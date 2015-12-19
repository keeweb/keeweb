'use strict';

var Backbone = require('backbone'),
    IconMap = require('../const/icon-map'),
    Launcher = require('../comp/launcher'),
    Logger = require('../util/logger');

var logger = new Logger('icon-select-view');

var IconSelectView = Backbone.View.extend({
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
        var target = $(e.target).closest('.icon-select__icon');
        var iconId = target[0].getAttribute('data-val');
        if (iconId === 'special') {
            var iconData = this.special[target.data('special')];
            if (iconData) {
                var id = this.model.file.addCustomIcon(iconData.data);
                this.trigger('select', { id: id, custom: true });
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        } else if (iconId) {
            var isCustomIcon = target.hasClass('icon-select__icon-custom');
            this.trigger('select', { id: iconId, custom: isCustomIcon });
        }
    },

    downloadIcon: function() {
        if (this.downloadingFavicon) {
            return;
        }
        this.downloadingFavicon = true;
        this.$el.find('.icon-select__icon-download>i').addClass('fa-spinner fa-spin');
        var that = this;
        var url = this.getIconUrl(!Launcher); // inside launcher we can load images without CORS
        var img = document.createElement('img');
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = function () {
            that.setSpecialImage(img, 'download');
            that.$el.find('.icon-select__icon-download img').remove();
            that.$el.find('.icon-select__icon-download>i').removeClass('fa-spinner fa-spin');
            that.$el.find('.icon-select__icon-download').addClass('icon-select__icon--custom-selected').append(img);
            that.downloadingFavicon = false;
        };
        img.onerror = function (e) {
            logger.error('Favicon download error: ' + url, e);
            that.$el.find('.icon-select__icon-download>i').removeClass('fa-spinner fa-spin');
            that.$el.find('.icon-select__icon-download').removeClass('icon-select__icon--custom-selected');
            that.downloadingFavicon = false;
        };
    },

    getIconUrl: function(useService) {
        if (!this.model.url) {
            return null;
        }
        var url = this.model.url.replace(/([^\/:]\/.*)?$/, function(match) { return (match && match[0]) + '/favicon.ico'; });
        if (url.indexOf('://') >= 0) {
            url = 'http://' + url;
        }
        if (useService) {
            return 'https://favicon-antelle.rhcloud.com/' + url.replace(/^.*:\/+/, '').replace(/\/.*/, '');
        }
        return url;
    },

    selectIcon: function() {
        this.$el.find('.icon-select__file-input').click();
    },

    iconSelected: function(e) {
        var that = this;
        var file = e.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = document.createElement('img');
                img.onload = function() {
                    that.setSpecialImage(img, 'select');
                    that.$el.find('.icon-select__icon-select img').remove();
                    that.$el.find('.icon-select__icon-select').addClass('icon-select__icon--custom-selected').append(img);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            that.$el.find('.icon-select__icon-select img').remove();
            that.$el.find('.icon-select__icon-select').removeClass('icon-select__icon--custom-selected');
        }
    },

    setSpecialImage: function(img, name) {
        var size = Math.min(img.width, 32);
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        var data = canvas.toDataURL().replace(/^.*,/, '');
        this.special[name] = { width: img.width, height: img.height, data: data };
    }
});

module.exports = IconSelectView;
