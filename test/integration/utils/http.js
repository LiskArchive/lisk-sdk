/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var popsicle = require('popsicle');
var apiCodes = require('../../../helpers/api_codes');

var headers = {
	Accept: 'application/json',
	'Content-Type': 'application/json',
};

var endpoints = {
	versions: {
		'0.9.*': {
			getBlocks: function(ip, port) {
				return `http://${ip}:${port}/api/blocks`;
			},
			getHeight: function(ip, port) {
				return `http://${ip}:${port}/api/blocks/getHeight`;
			},
			getTransactions: function(ip, port) {
				return `http://${ip}:${port}/peer/blocks`;
			},
			postTransaction: function(ip, port) {
				return `http://${ip}:${port}/peer/transactions`;
			},
			enableForging: function(ip, port) {
				return `http://${ip}:${port}/api/delegates/forging/enable`;
			},
		},
		'1.0.0': {
			getBlocks: function(ip, port) {
				return `http://${ip}:${port}/api/blocks`;
			},
			getHeight: function(ip, port) {
				return `http://${ip}:${port}/api/node/status`;
			},
			postTransaction: function(ip, port) {
				return `http://${ip}:${port}/api/transactions`;
			},
			enableForging: function(ip, port) {
				return `http://${ip}:${port}/api/node/status/forging`;
			},
			getTransactions: function(ip, port) {
				return `http://${ip}:${port}/api/transactions`;
			},
		},
	},
};

var currentVersion = '1.0.0';

module.exports = {
	getVersion: function() {
		return currentVersion;
	},

	setVersion: function(version) {
		currentVersion = version;
	},

	getBlocks: function(port, ip) {
		return popsicle
			.get({
				url: endpoints.versions[currentVersion].getBlocks(
					ip || '127.0.0.1',
					port || 4000
				),
				headers: headers,
			})
			.then(res => {
				if (res.status !== apiCodes.OK) {
					throw new Error(`Failed to get blocks from peer: ${res.body}`);
				}
				return JSON.parse(res.body).data;
			});
	},

	getHeight: function(port, ip) {
		return popsicle
			.get({
				url: endpoints.versions[currentVersion].getHeight(
					ip || '127.0.0.1',
					port || 4000
				),
				headers: headers,
			})
			.then(res => {
				return res.body.height;
			});
	},

	getTransaction: function(transactionId, port, ip) {
		return popsicle
			.get({
				url: `${endpoints.versions[currentVersion].getTransactions(
					ip || '127.0.0.1',
					port || 4000
				)}?id=${transactionId}`,
				headers: headers,
			})
			.then(res => {
				if (currentVersion === '1.0.0') {
					return JSON.parse(res.body).data[0];
				} else {
					return JSON.parse(res.body).transactions[0];
				}
			});
	},

	enableForging: function(keys, port, ip) {
		return popsicle
			.put({
				url: endpoints.versions[currentVersion].enableForging(
					ip || '127.0.0.1',
					port || 4000
				),
				headers: headers,
				body: {
					decryptionKey: 'elephant tree paris dragon chair galaxy',
					publicKey: keys.publicKey,
				},
			})
			.then(res => {
				if (res.status !== apiCodes.OK) {
					throw new Error(
						`Failed to enable forging for delegate with publicKey: ${
							keys.publicKey
						}`
					);
				}
				return JSON.parse(res.body).data[0];
			})
			.catch(err => {
				throw new Error(
					`Failed to enable forging for delegate with publicKey: ${
						keys.publicKey
					}${JSON.stringify(err)}`
				);
			});
	},
};
