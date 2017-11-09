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

PeersController.getPeers = function (req, res) {

	var filters = {
		ip: req.swagger.params.ip.value,
		port: req.swagger.params.wsPort.value,
		httpPort: req.swagger.params.httpPort.value,
		state: req.swagger.params.state.value,
		os: req.swagger.params.os.value,
		version: req.swagger.params.version.value,
		broadhash: req.swagger.params.broadhash.value,
		height: req.swagger.params.height.value,
		limit: req.swagger.params.limit.value,
		offset: req.swagger.params.offset.value,
		orderBy: req.swagger.params.sort.value
	};

	// Remove filters with null values
	filters = _.pickBy(filters, function (v) {
		return !(v === undefined || v === null);
	});

	modules.peers.shared.getPeers(filters, function (err, data) {

		data = _.cloneDeep(data);

		data = _.map(data, function (peer) {
			peer.wsPort = peer.port;
			delete peer.port;
			delete peer.updated;
			delete peer.clock;
			return peer;
		});

		res.send({peers: data});
	});
};

module.exports = PeersController;
