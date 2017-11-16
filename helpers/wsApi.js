'use strict';

var _ = require('lodash');
var url = require('url');
var failureCodes = require('../api/ws/rpc/failureCodes.js');
var Z_schema = require('../helpers/z_schema.js');
var schema = require('../schema/transport.js');
var Peer = require('../logic/peer.js');
var constants = require('./constants');

var z_schema = new Z_schema();

var middleware = {

	Handshake: function (system) {
		return function (headers, cb) {
			z_schema.validate(headers, schema.headers, function (error) {
				if (error) {
					return setImmediate(cb, {
						code: failureCodes.INVALID_HEADERS,
						description: error[0].path + ': ' + error[0].message
					}, null);
				}

				headers.state = Peer.STATE.CONNECTED;
				var peer = new Peer(headers);

				if (!system.nonceCompatible(headers.nonce)) {
					return setImmediate(cb, {
						code: failureCodes.INCOMPATIBLE_NONCE,
						description: 'Expected nonce to be not equal to: ' + system.getNonce()
					}, peer);
				}

				if (!system.networkCompatible(headers.nethash)) {
					return setImmediate(cb, {
						code: failureCodes.INCOMPATIBLE_NETWORK,
						description: 'Expected nethash: ' + system.getNethash() + ' but received: ' + headers.nethash
					}, peer);
				}

				if (!system.versionCompatible(headers.version)) {
					return setImmediate(cb, {
						code: failureCodes.INCOMPATIBLE_VERSION,
						description: 'Expected version: ' + system.getMinVersion() + ' but received: ' + headers.version
					}, peer);
				}
				return setImmediate(cb, null, peer);
			});
		};
	}
};

var extractHeaders = function (request) {
	var headers = _.get(url.parse(request.url, true), 'query', null);
	headers.ip = request.remoteAddress.split(':').pop();
	headers.httpPort = +headers.httpPort;
	headers.port = +headers.port;
	headers.height = +headers.height;
	return headers;
};

module.exports = {
	middleware: middleware,
	extractHeaders: extractHeaders
};
