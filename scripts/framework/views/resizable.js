import { Events } from 'framework/events';

const Resizable = {
    listenDrag(dragView) {
        this.listenTo(dragView, 'dragstart', this.dragStart);
        this.listenTo(dragView, 'drag', this.drag);
        this.listenTo(dragView, 'autosize', this.autoSize);
    },

    dragStart(e) {
        this._dragInfo = this.getDragInfo(e.coord);
    },

    drag(e) {
        const dragInfo = this._dragInfo;
        let size = dragInfo.startSize + e.offset;
        size = Math.max(dragInfo.min, Math.min(dragInfo.max, size));
        this.$el[dragInfo.prop](size);
        this.emit('view-resize', size);
        Events.emit('page-geometry', { source: 'resizable' });
    },

    autoSize(e) {
        const dragInfo = this.getDragInfo(e.coord);
        if (dragInfo.auto !== undefined) {
            this.$el.css(dragInfo.prop, dragInfo.auto);
        } else {
            this.$el.css(dragInfo.prop, '');
        }
        this.fixSize(dragInfo);
        this.emit('view-resize', null);
        Events.emit('page-geometry', { source: 'resizable' });
    },

    fixSize(cfg) {
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

    getDragInfo(coord) {
        const prop = coord === 'x' ? 'Width' : 'Height';
        const propLower = prop.toLowerCase();
        const min = this.getSizeProp('min' + prop);
        const max = this.getSizeProp('max' + prop);
        const auto = this.getSizeProp('auto' + prop);
        const startSize = this.$el[propLower]();
        return { startSize, prop: propLower, min, max, auto };
    },

    getSizeProp(prop) {
        const member = this[prop];
        return typeof member === 'function' ? member.call(this) : member;
    }
};

export { Resizable };
