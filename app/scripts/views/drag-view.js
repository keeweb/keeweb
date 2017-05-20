const Backbone = require('backbone');

const DragView = Backbone.View.extend({
    events: {
        'mousedown': 'mousedown'
    },

    initialize: function (coord) {
        this.setCoord(coord);
        this.mouseDownTime = -1;
        this.mouseDownCount = 0;
    },

    setCoord: function(coord) {
        this.coord = coord;
        this.offsetProp = 'page' + coord.toUpperCase();
    },

    render: function() {
        $('<div/>').addClass('drag-handle__inner').appendTo(this.$el);
    },

    mousedown: function(e) {
        if (e.which === 1) {
            const now = Date.now();
            if (now - this.mouseDownTime < 500) {
                this.mouseDownCount++;
                if (this.mouseDownCount === 2) {
                    this.trigger('autosize', { coord: this.coord });
                    return;
                }
            } else {
                this.mouseDownTime = now;
                this.mouseDownCount = 1;
            }
            this.initialOffset = e[this.offsetProp];
            const cursor = this.$el.css('cursor');
            this.dragMask = $('<div/>', {'class': 'drag-mask'}).css('cursor', cursor).appendTo('body');
            this.dragMask.on('mousemove', this.mousemove.bind(this));
            this.dragMask.on('mouseup', this.mouseup.bind(this));
            this.trigger('dragstart', { offset: this.initialOffset, coord: this.coord });
            this.$el.addClass('dragging');
            e.preventDefault();
        }
    },

    mousemove: function(e) {
        if (e.which === 0) {
            this.mouseup();
        } else {
            this.trigger('drag', { offset: e[this.offsetProp] - this.initialOffset });
        }
    },

    mouseup: function() {
        this.dragMask.remove();
        this.$el.removeClass('dragging');
    }
});

module.exports = DragView;
