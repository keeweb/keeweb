import { View } from 'framework/views/view';
import { IconMap } from 'const/icon-map';
import { Logger } from 'util/logger';
import template from 'templates/icon-select.hbs';

const logger = new Logger('icon-select-view');

class IconSelectView extends View {
    template = template;

    events = {
        'click .icon-select__icon': 'iconClick',
        'click .icon-select__icon-download': 'downloadIcon',
        'click .icon-select__icon-select': 'selectIcon',
        'change .icon-select__file-input': 'iconSelected'
    };

    special = {
        select: null,
        download: null
    };

    render() {
        const customIcons = this.model.file.getCustomIcons();
        const hasCustomIcons = Object.keys(customIcons).length > 0;
        super.render({
            sel: this.model.iconId,
            icons: IconMap,
            canDownloadFavicon: !!this.model.url,
            customIcons,
            hasCustomIcons
        });
    }

    iconClick(e) {
        const target = $(e.target).closest('.icon-select__icon');
        const iconId = target[0].getAttribute('data-val');
        if (iconId === 'special') {
            const iconData = this.special[target.data('special')];
            if (iconData) {
                const id = this.model.file.addCustomIcon(iconData.data);
                this.emit('select', { id, custom: true });
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        } else if (iconId) {
            const isCustomIcon = target.hasClass('icon-select__icon-custom');
            this.emit('select', { id: iconId, custom: isCustomIcon });
        }
    }

    downloadIcon() {
        if (this.downloadingFavicon) {
            return;
        }
        this.downloadingFavicon = true;
        this.$el.find('.icon-select__icon-download>i').addClass('spin');
        this.$el
            .find('.icon-select__icon-download')
            .addClass('icon-select__icon--progress')
            .removeClass('icon-select__icon--download-error');
        const url = this.getIconUrl(true);
        const img = document.createElement('img');
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            this.setSpecialImage(img, 'download');
            this.$el.find('.icon-select__icon-download img').remove();
            this.$el.find('.icon-select__icon-download>i').removeClass('spin');
            this.$el
                .find('.icon-select__icon-download')
                .removeClass('icon-select__icon--progress')
                .addClass('icon-select__icon--custom-selected')
                .append(img);
            this.downloadingFavicon = false;

            const id = this.model.file.addCustomIcon(this.special.download.data);
            this.emit('select', { id, custom: true });
        };
        img.onerror = (e) => {
            logger.error('Favicon download error: ' + url, e);
            this.$el.find('.icon-select__icon-download>i').removeClass('spin');
            this.$el
                .find('.icon-select__icon-download')
                .removeClass('icon-select__icon--custom-selected icon-select__icon--progress')
                .addClass('icon-select__icon--download-error');
            this.downloadingFavicon = false;
        };
    }

    getIconUrl(useService) {
        if (!this.model.url) {
            return null;
        }
        let url = this.model.url.replace(
            /([^\/:]\/.*)?$/,
            (match) => (match && match[0]) + '/favicon.ico'
        );
        if (url.indexOf('://') < 0) {
            url = 'http://' + url;
        }
        if (useService) {
            return (
                'https://services.keeweb.info/favicon/' +
                url.replace(/^.*:\/+/, '').replace(/\/.*/, '')
            );
        }
        return url;
    }

    selectIcon(e) {
        const btn = e.target.closest('.icon-select__icon-select');
        if (btn.classList.contains('icon-select__icon--custom-selected')) {
            return;
        }

        this.$el.find('.icon-select__file-input').click();
    }

    iconSelected(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.onload = () => {
                    this.setSpecialImage(img, 'select');
                    this.$el.find('.icon-select__icon-select img').remove();
                    this.$el
                        .find('.icon-select__icon-select')
                        .addClass('icon-select__icon--custom-selected')
                        .append(img);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            this.$el.find('.icon-select__icon-select img').remove();
            this.$el
                .find('.icon-select__icon-select')
                .removeClass('icon-select__icon--custom-selected');
        }
    }

    setSpecialImage(img, name) {
        const size = Math.min(img.width, 32);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = canvas.toDataURL().replace(/^.*,/, '');
        this.special[name] = { width: img.width, height: img.height, data };
    }
}

export { IconSelectView };
