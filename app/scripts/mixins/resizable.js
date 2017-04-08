const Backbone = require('backbone');

const Resizable = {
    listenDrag: function(dragView) {
        this.listenTo(dragView, 'dragstart', this.dragStart);
        this.listenTo(dragView, 'drag', this.drag);
        this.listenTo(dragView, 'autosize', this.autoSize);
    },

    dragStart: function(e) {
        this._dragInfo = this.getDragInfo(e.coord);
    },

    drag: function(e) {
        const dragInfo = this._dragInfo;
        let size = dragInfo.startSize + e.offset;
        size = Math.max(dragInfo.min, Math.min(dragInfo.max, size));
        this.$el[dragInfo.prop](size);
        this.trigger('view-resize', size);
        Backbone.trigger('page-geometry', { source: 'resizable' });
    },

    autoSize: function(e) {
        const dragInfo = this.getDragInfo(e.coord);
        if (dragInfo.auto !== undefined) {
            this.$el.css(dragInfo.prop, dragInfo.auto);
        } else {
            this.$el.css(dragInfo.prop, 'auto');
        }
        this.fixSize(dragInfo);
        this.trigger('view-resize', null);
        Backbone.trigger('page-geometry', { source: 'resizable' });
    },

    fixSize: function(cfg) {
        const size = this.$el[cfg.prop]();
        const newSize = Math.max(cfg.min, Math.min(cfg.max, size));
        if (newSize !== size) {
            this.$el[cfg.prop](size);
        }
    },

    // TODO: check size on window resize
    // checkSize: function() {
    //     if (this.maxWidth) {
    //         this.fixSize(this.getDragInfo('x'));
    //     }
    //     if (this.maxHeight) {
    //         this.fixSize(this.getDragInfo('y'));
    //     }
    // },

    getDragInfo: function(coord) {
        const prop = coord === 'x' ? 'Width' : 'Height';
        const propLower = prop.toLowerCase();
        const min = this.getSizeProp('min' + prop);
        const max = this.getSizeProp('max' + prop);
        const auto = this.getSizeProp('auto' + prop) || 'auto';
        const startSize = this.$el[propLower]();
        return { startSize: startSize, prop: propLower, min: min, max: max, auto: auto };
    },

    getSizeProp: function(prop) {
        const member = this[prop];
        return typeof member === 'function' ? member.call(this) : member;
    }
};

module.exports = Resizable;
