'use strict';

var Peer = require('../logic/peer.js');

module.exports = {
	handshake: function (ip, port, headers, validateHeaders, cb) {

		var headersRequirements = [
			{'nethash': {
				errorMessage: 'Request is made on the wrong network',
				expected: modules.system.getNethash()
				// received: headers.nethash
			}},
			{'version': modules.system.versionCompatible}
		];

		var peer = new Peer({
			ip: ip,
			port: port
		});

		headers = peer.applyHeaders(headers);

		validateHeaders(headers, function (error, extraMessage) {
			if (error) {
				__private.removePeer({peer: peer, code: 'EHEADERS'}, extraMessage);
				return setImmediate(cb, {success: false, error: error});
			}

			var headersError = headersRequirements.any();

			if (!modules.system.networkCompatible(headers.nethash)) {
				// Remove peer
				__private.removePeer({peer: peer, code: 'ENETHASH'}, extraMessage);

				return setImmediate(cb, {
					success: false,
					message: 'Request is made on the wrong network',
					expected: modules.system.getNethash(),
					received: headers.nethash
				});
			}

			if (!modules.system.versionCompatible(headers.version)) {
				// Remove peer
				__private.removePeer({
					peer: peer,
					code: 'EVERSION:' + headers.version
				}, extraMessage);

				return setImmediate(cb, {
					success: false,
					message: 'Request is made from incompatible version',
					expected: modules.system.getMinVersion(),
					received: headers.version
				});
			}

			modules.peers.update(peer);

			return setImmediate(cb, null, peer);
		});
	}
};