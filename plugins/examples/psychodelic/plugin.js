/**
 * KeeWeb plugin: psychodelic
 * @author antelle
 * @license MIT
 */

const DetailsView = require('views/details/details-view');

const detailsViewRender = DetailsView.prototype.render;
DetailsView.prototype.render = function () {
    detailsViewRender.apply(this);
    this.$el.find('.details__header:first').addClass('input-shake');
    return this;
};

module.exports.uninstall = function () {
    DetailsView.prototype.render = detailsViewRender;
};
