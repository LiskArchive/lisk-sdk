'use strict';

var randomstring = require('randomstring');

var randomPeer = {
	'broadhash': '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
	'dappid': null,
	'height': 1,
	'ip': '40.40.40.40',
	'os': 'unknown',
	'port': 4000,
	'state': 2,
	'version': '0.0.0'
};

function generateRandomActivePeer () {
	var randomDigits = function (length) {
		return randomstring.generate({charset: 'numeric', length: length});
	};
	return {
		'broadhash': randomstring.generate(64),
		'dappid': null,
		'height': randomDigits(4),
		'ip': randomDigits(3) + '.' + randomDigits(3) + '.' + randomDigits(3) + '.' + randomDigits(3),
		'os': randomstring.generate(10),
		'port': randomstring.generate({charset: 'numeric', length: 4}),
		'state': 2,
		'nonce': randomstring.generate(16),
		'version': randomDigits(1) + '.' + randomDigits(1) + '.' + randomDigits(1)
	};
}

module.exports = {
	randomPeer: randomPeer,
	generateRandomActivePeer: generateRandomActivePeer
};
