'use strict';

var sinon = require('sinon');

var randomPeer = {
	'broadhash': '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
	'dappid': null,
	'height': 1,
	'ip': '40.40.40.40',
	'os': 'unknown',
	'port': 4000,
	'httpPort': 4001,
	'state': 2,
	'version': '0.0.0',
	'nonce': 'randomnonce',
	rpc: {}
};

module.exports = {
	randomPeer: randomPeer
};
