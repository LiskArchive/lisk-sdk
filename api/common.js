'use strict';

var z_schema = require('../helpers/z_schema.js');

var schema = require('../schema/transport.js');
var Peer = require('../logic/peer.js');
var System = require('../modules/system');

module.exports.handshake = function (headers, cb) {

	var peer = new Peer({
		ip: headers.ip,
		port: headers.port
	});

	headers = peer.applyHeaders(headers);

	z_schema.validate(headers, schema.headers, function (error) {

		if (error) {
			return setImmediate(cb, {
				success: false,
				error: error,
				code: 'EHEADERS'
			}, peer);
		}

		if (!System.prototype.networkCompatible(headers.nethash)) {
			return setImmediate(cb, {
				success: false,
				message: 'Request is made on the wrong network',
				expected: System.prototype.getNethash(),
				received: headers.nethash,
				code: 'ENETHASH'
			}, peer);
		}

		if (!System.prototype.versionCompatible(headers.version)) {
			return setImmediate(cb, {
				success: false,
				message: 'Request is made from incompatible version',
				expected: System.prototype.getMinVersion(),
				received: headers.version,
				code: 'EVERSION'
			}, peer);
		}

		return setImmediate(cb, null, peer);
	});

};
