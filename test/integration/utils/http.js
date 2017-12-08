'use strict';

var popsicle = require('popsicle');
var apiCodes = require('../../../helpers/apiCodes');

var headers = {
	'Accept': 'application/json',
	'Content-Type': 'application/json'
};

var endpoints = {
	versions: {
		'0.9.*': {
			getBlocks: function (ip, port) {
				return 'http://' + ip + ':' + port + '/api/blocks';
			},
			getHeight: function (ip, port) {
				return 'http://' + ip + ':' + port + '/api/blocks/getHeight';
			},
			getTransactions: function (ip, port) {
				return 'http://' + ip + ':' + port + '/peer/blocks';
			},
			postTransaction: function (ip, port) {
				return 'http://' + ip + ':' + port + '/peer/transactions';
			},
			enableForging: function (ip, port) {
				return 'http://' + ip + ':' + port + '/api/delegates/forging/enable';
			}
		},
		'1.0.0': {
			getBlocks: function (ip, port) {
				return 'http://' + ip + ':' + port + '/api/blocks';
			},
			getHeight: function (ip, port) {
				return 'http://' + ip + ':' + port + '/api/node/status';
			},
			postTransaction: function (ip, port) {
				return 'http://' + ip + ':' + port + '/api/transactions';
			},
			enableForging: function (ip, port) {
				return 'http://' + ip + ':' + port + '/api/node/status/forging';
			},
			getTransactions: function (ip, port) {
				return 'http://' + ip + ':' + port + '/api/transactions';
			}
		}
	}
};

var currentVersion = '1.0.0';

module.exports = {

	getVersion: function () {
		return currentVersion;
	},

	setVersion: function (version) {
		currentVersion = version;
	},

	getBlocks: function (port, ip) {
		return popsicle.get({
			url: endpoints.versions[currentVersion].getBlocks(ip || '127.0.0.1', port || 4000),
			headers: headers
		}).then(function (res) {
			if (res.status !== apiCodes.OK) {
				throw new Error('Unable to get blocks from peer: ' + res.body);
			}
			return JSON.parse(res.body).data;
		});
	},

	getHeight: function (port, ip) {
		return popsicle.get({
			url: endpoints.versions[currentVersion].getHeight(ip || '127.0.0.1', port || 4000),
			headers: headers
		}).then(function (res) {
			return res.body.height;
		});
	},

	getTransaction: function (transactionId, port, ip) {
		return popsicle.get({
			url: endpoints.versions[currentVersion].getTransactions(ip || '127.0.0.1', port || 4000) + '?id=' + transactionId,
			headers: headers
		}).then(function (res) {
			if(currentVersion === '1.0.0') {
				return JSON.parse(res.body).data[0];
			} else {
				return JSON.parse(res.body).transactions[0];
			}
		});
	},

	enableForging: function (keys, port, ip) {
		return popsicle.put({
			url: endpoints.versions[currentVersion].enableForging(ip || '127.0.0.1', port || 4000),
			headers: headers,
			body: {
				decryptionKey: 'elephant tree paris dragon chair galaxy',
				publicKey: keys.publicKey
			}
		}).then(function (res) {
			if (res.status !== apiCodes.OK) {
				throw new Error('Unable to enable forging for delegate with publicKey: ' + keys.publicKey);
			}
			return JSON.parse(res.body).data[0];
		}).catch(function (err) {
			throw new Error('Unable to enable forging for delegate with publicKey: ' + keys.publicKey + JSON.stringify(err));
		});
	}
};
