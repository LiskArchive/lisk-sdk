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

const popsicle = require('popsicle');
const apiCodes = require('../../../helpers/api_codes');

const headers = {
	Accept: 'application/json',
	'Content-Type': 'application/json',
};

const endpoints = {
	versions: {
		'0.9.*': {
			getBlocks(ip, port) {
				return `http://${ip}:${port}/api/blocks`;
			},
			getHeight(ip, port) {
				return `http://${ip}:${port}/api/blocks/getHeight`;
			},
			getTransactions(ip, port) {
				return `http://${ip}:${port}/peer/blocks`;
			},
			postTransaction(ip, port) {
				return `http://${ip}:${port}/peer/transactions`;
			},
			enableForging(ip, port) {
				return `http://${ip}:${port}/api/delegates/forging/enable`;
			},
		},
		'1.0.0': {
			getBlocks(ip, port) {
				return `http://${ip}:${port}/api/blocks`;
			},
			getHeight(ip, port) {
				return `http://${ip}:${port}/api/node/status`;
			},
			getNodeStatus(ip, port) {
				return `http://${ip}:${port}/api/node/status`;
			},
			postTransaction(ip, port) {
				return `http://${ip}:${port}/api/transactions`;
			},
			enableForging(ip, port) {
				return `http://${ip}:${port}/api/node/status/forging`;
			},
			getTransactions(ip, port) {
				return `http://${ip}:${port}/api/transactions`;
			},
			getPeers(ip, port) {
				return `http://${ip}:${port}/api/peers`;
			},
		},
	},
};

let currentVersion = '1.0.0';

module.exports = {
	setVersion(version) {
		currentVersion = version;
	},

	getBlocks(port, ip) {
		return popsicle
			.get({
				url: endpoints.versions[currentVersion].getBlocks(
					ip || '127.0.0.1',
					port || 4000
				),
				headers,
			})
			.then(res => {
				if (res.status !== apiCodes.OK) {
					throw new Error(`Failed to get blocks from peer: ${res.body}`);
				}
				return JSON.parse(res.body).data;
			});
	},

	getHeight(port, ip) {
		return popsicle
			.get({
				url: endpoints.versions[currentVersion].getHeight(
					ip || '127.0.0.1',
					port || 4000
				),
				headers,
			})
			.then(res => {
				return res.body.height;
			});
	},

	getNodeStatus(port, ip) {
		return popsicle
			.get({
				url: endpoints.versions[currentVersion].getNodeStatus(
					ip || '127.0.0.1',
					port || 4000
				),
				headers,
			})
			.then(res => {
				return JSON.parse(res.body).data;
			});
	},

	getTransaction(transactionId, port, ip) {
		return popsicle
			.get({
				url: `${endpoints.versions[currentVersion].getTransactions(
					ip || '127.0.0.1',
					port || 4000
				)}?id=${transactionId}`,
				headers,
			})
			.then(res => {
				if (currentVersion === '1.0.0') {
					return JSON.parse(res.body).data[0];
				}
				return JSON.parse(res.body).transactions[0];
			});
	},

	enableForging(keys, port, ip) {
		return popsicle
			.put({
				url: endpoints.versions[currentVersion].enableForging(
					ip || '127.0.0.1',
					port || 4000
				),
				headers,
				body: {
					password: 'elephant tree paris dragon chair galaxy',
					publicKey: keys.publicKey,
					forging: true,
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

	getPeers(port, ip) {
		return popsicle
			.get({
				url: endpoints.versions[currentVersion].getPeers(
					ip || '127.0.0.1',
					port || 4000
				),
				headers,
			})
			.then(res => {
				return JSON.parse(res.body).data;
			});
	},
};
