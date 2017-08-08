'use strict';

var _ = require('lodash');
var url = require('url');
var checkIpInList = require('./checkIpInList');
var Z_schema = require('../helpers/z_schema.js');
var schema = require('../schema/transport.js');
var Peer = require('../logic/peer.js');
var constants = require('./constants');

var z_schema = new Z_schema();

var middleware = {

	Handshake: function (system) {
		return function (headers, cb) {
			headers = headers || {};
			var peer = new Peer(headers);
			headers.state = Peer.STATE.CONNECTED;

			z_schema.validate(headers, schema.headers, function (error) {
				headers = peer.applyHeaders(headers);

				if (error) {
					return setImmediate(cb, {
						success: false,
						error: error,
						message: error.toString(),
						code: 'EHEADERS'
					}, peer);
				}

				if (!system.nonceCompatible(headers.nonce)) {
					return setImmediate(cb, {
						success: false,
						message: 'Request is made by itself',
						expected: 'different than ' + system.getNonce(),
						received: headers.nonce,
						code: 'ENONCE'
					}, peer);
				}

				if (!system.networkCompatible(headers.nethash)) {
					return setImmediate(cb, {
						success: false,
						message: 'Request is made on the wrong network',
						expected: system.getNethash(),
						received: headers.nethash,
						code: 'ENETHASH'
					}, peer);
				}

				if (!system.versionCompatible(headers.version)) {
					return setImmediate(cb, {
						success: false,
						message: 'Request is made from incompatible version',
						expected: system.getMinVersion(),
						received: headers.version,
						peer: peer,
						code: 'EVERSION'
					}, peer);
				}

				return setImmediate(cb, null, peer);
			});
		};
	}
};

var extractHeaders = function (request) {
	var headers = _.get(url.parse(request.url, true), 'query', {});
	if (!headers) {
		throw new Error('No headers specified');
	}

	headers.ip = request.remoteAddress.split(':').pop();
	headers.port = parseInt(headers.port);

	if (!headers.nonce || headers.nonce.length !== 16) {
		throw new Error('Received empty or unmatched nonce');
	}

	return headers;
};

module.exports = {
	middleware: middleware,
	extractHeaders: extractHeaders
};
