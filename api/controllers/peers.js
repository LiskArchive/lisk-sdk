'use strict';

var _ = require('lodash');

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class PeersController
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
function PeersController (scope) {
	modules = scope.modules;
}

PeersController.getPeers = function (context, next) {

	var params = context.request.swagger.params;

	var filters = {
		ip: params.ip.value,
		port: params.wsPort.value,
		httpPort: params.httpPort.value,
		state: params.state.value,
		os: params.os.value,
		version: params.version.value,
		broadhash: params.broadhash.value,
		height: params.height.value,
		limit: params.limit.value,
		offset: params.offset.value,
		sort: params.sort.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, function (v) {
		return !(v === undefined || v === null);
	});

	modules.peers.shared.getPeers(filters, function (err, data) {

		if (err) { return next(err); }

		data = _.cloneDeep(data);

		data = _.map(data, function (peer) {
			peer.wsPort = peer.port;
			delete peer.port;
			delete peer.updated;
			delete peer.clock;
			return peer;
		});

		next(null, {
			data: data,
			meta: {
				offset: filters.offset,
				limit: filters.limit,
				total: modules.peers.shared.getPeersCount()
			}
		});
	});
};

module.exports = PeersController;
