/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import {
	TESTNET_NETHASH,
	TESTNET_NODES,
	MAINNET_NETHASH,
	MAINNET_NODES,
} from 'constants';
import * as resources from './resources';

const defaultOptions = {
	bannedNode: [],
	version: '1.0.0',
	minVersion: '>=1.0.0',
	randomizeNode: true,
};

const commonHeaders = {
	'Content-Type': 'application/json',
	os: 'lisk-js-api',
};

const getHeaders = (nethash, version, minVersion) =>
	Object.assign({}, commonHeaders, {
		nethash,
		version,
		minVersion,
	});

export default class APIClient {
	constructor(nodes, nethash, providedOptions = {}) {
		if (!Array.isArray(nodes) || nodes.length <= 0) {
			throw Error('Require nodes to be initialized.');
		}

		if (typeof nethash !== 'string' || nethash === '') {
			throw Error('Require nethash to be initialized.');
		}

		const options = Object.assign({}, defaultOptions, providedOptions);

		this.headers = getHeaders(nethash, options.version, options.minVersion);
		this.nodes = nodes;
		this.bannedNodes = [...(options.bannedNodes || [])];
		this.currentNode = options.node || this.getNewNode();
		this.randomizeNodes = options.randomizeNodes !== false;

		this.accounts = new resources.AccountsResource(this);
		this.blocks = new resources.BlocksResource(this);
		this.dapps = new resources.DappsResource(this);
		this.delegates = new resources.DelegatesResource(this);
		this.signatures = new resources.SignaturesResource(this);
		this.transactions = new resources.TransactionsResource(this);
		this.voters = new resources.VotersResource(this);
		this.votes = new resources.VotesResource(this);
	}

	getNewNode() {
		const nodes = this.nodes.filter(node => !this.isBanned(node));

		if (nodes.length === 0) {
			throw new Error(
				'Cannot get random node: all relevant nodes have been banned.',
			);
		}

		const randomIndex = Math.floor(Math.random() * nodes.length);
		return nodes[randomIndex];
	}

	banActiveNode() {
		if (!this.isBanned(this.currentNode)) {
			this.bannedNodes.push(this.currentNode);
			return true;
		}
		return false;
	}

	banActiveNodeAndSelect() {
		const banned = this.banActiveNode();
		if (banned) {
			this.currentNode = this.getNewNode();
		}
		return banned;
	}

	hasAvailableNodes() {
		return this.nodes.some(node => !this.isBanned(node));
	}

	isBanned(node) {
		return this.bannedNodes.includes(node);
	}
}

export const getMainnetClient = options =>
	new APIClient(MAINNET_NODES, MAINNET_NETHASH, options);

export const getTestnetClient = options =>
	new APIClient(TESTNET_NODES, TESTNET_NETHASH, options);
