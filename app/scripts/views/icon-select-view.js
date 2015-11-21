'use strict';

var Backbone = require('backbone'),
    IconMap = require('../const/icon-map');

var IconSelectView = Backbone.View.extend({
    template: require('templates/icon-select.html'),

    events: {
        'click .icon-select__icon': 'iconClick',
        'click .icon-select__icon-download': 'downloadIcon',
        'click .icon-select__icon-select': 'selectIcon',
        'change .icon-select__file-input': 'iconSelected'
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
        if (iconId) {
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
        var url = this.getIconUrl();
        var img = document.createElement('img');
        img.src = url;
        img.onload = function() {
            that.$el.find('.icon-select__icon-download img').remove();
            that.$el.find('.icon-select__icon-download>i').removeClass('fa-spinner fa-spin');
            that.$el.find('.icon-select__icon-download').addClass('icon-select__icon--custom-selected').append(img);
            that.downloadingFavicon = false;
        };
        img.onerror = function(e) {
            console.error('Favicon download error: ' + url, e);
            that.$el.find('.icon-select__icon-download>i').removeClass('fa-spinner fa-spin');
            that.$el.find('.icon-select__icon-download').removeClass('icon-select__icon--custom-selected');
            that.downloadingFavicon = false;
        };
    },

    getIconUrl: function() {
        if (!this.model.url) {
            return null;
        }
        var url = this.model.url.replace(/([^\/:]\/.*)?$/, function(match) { return (match && match[0]) + '/favicon.ico'; });
        if (url.indexOf('://') < 0) {
            url = 'http://' + url;
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
                img.src = e.target.result;
                that.$el.find('.icon-select__icon-select img').remove();
                that.$el.find('.icon-select__icon-select').addClass('icon-select__icon--custom-selected').append(img);
            };
            reader.readAsDataURL(file);
        } else {
            that.$el.find('.icon-select__icon-select img').remove();
            that.$el.find('.icon-select__icon-select').removeClass('icon-select__icon--custom-selected');
        }
    }
});

module.exports = IconSelectView;
