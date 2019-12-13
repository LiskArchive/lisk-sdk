/*
 * Copyright © 2019 Lisk Foundation
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
const apiCodes = require('../../../../src/modules/http_api/api_codes');

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

	getBlocks({ port = 4000, ip = '127.0.0.1' }) {
		return popsicle
			.get({
				url: endpoints.versions[currentVersion].getBlocks(ip, port),
				headers,
			})
			.then(res => {
				if (res.status !== apiCodes.OK) {
					throw new Error(`Failed to get blocks from peer: ${res.body}`);
				}
				return JSON.parse(res.body).data;
			});
	},

	async getHeight({ port = 4000, ip = '127.0.0.1' }) {
		return popsicle
			.get({
				url: endpoints.versions[currentVersion].getHeight(ip, port),
				headers,
			})
			.then(res => {
				return JSON.parse(res.body).data.height;
			});
	},

	getNodeStatus({ port = 4000, ip = '127.0.0.1' }) {
		return popsicle
			.get({
				url: endpoints.versions[currentVersion].getNodeStatus(ip, port),
				headers,
			})
			.then(res => {
				return JSON.parse(res.body).data;
			});
	},

	getTransaction({ id, port = 4000, ip = '127.0.0.1' }) {
		return popsicle
			.get({
				url: `${endpoints.versions[currentVersion].getTransactions(
					ip,
					port,
				)}?id=${id}`,
				headers,
			})
			.then(res => {
				if (currentVersion === '1.0.0') {
					return JSON.parse(res.body).data[0];
				}
				return JSON.parse(res.body).transactions[0];
			});
	},

	getTransactionsFromBlock({ blockId, port = 4000, ip = '127.0.0.1' }) {
		return popsicle
			.get({
				url: `${endpoints.versions[currentVersion].getTransactions(
					ip,
					port,
				)}?blockId=${blockId}`,
				headers,
			})
			.then(res => {
				if (currentVersion === '1.0.0') {
					return JSON.parse(res.body).data;
				}
				return JSON.parse(res.body).transactions;
			});
	},

	enableForging({ keys, port = 4000, ip = '127.0.0.1' }) {
		return popsicle
			.put({
				url: endpoints.versions[currentVersion].enableForging(ip, port),
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
						`Failed to enable forging for delegate with publicKey: ${keys.publicKey}`,
					);
				}
				return JSON.parse(res.body).data[0];
			})
			.catch(err => {
				throw new Error(
					`Failed to enable forging for delegate with publicKey: ${
						keys.publicKey
					}${JSON.stringify(err)}`,
				);
			});
	},

	getPeers({ port = 4000, ip = '127.0.0.1' }) {
		return popsicle
			.get({
				url: endpoints.versions[currentVersion].getPeers(ip, port),
				headers,
			})
			.then(res => {
				return JSON.parse(res.body).data;
			});
	},
};
