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
	LIVE_PORT,
	SSL_PORT,
	TEST_PORT,
	TESTNET_NETHASH,
	MAINNET_NETHASH,
} from 'constants';
import config from '../../config.json';
import * as resources from './resources';

const commonHeaders = {
	'Content-Type': 'application/json',
	os: 'lisk-js-api',
	version: '1.0.0',
	minVersion: '>=0.5.0',
};

export default class LiskAPI {
	constructor(providedOptions) {
		const options = Object.assign({}, config.options, providedOptions);
		this.ssl = options.ssl !== undefined ? options.ssl : true;
		this.testnet = options.testnet || false;
		const nethash =
			options.headers && options.headers.nethash
				? options.headers.nethash
				: null;

		this.defaultNodes = [...(options.nodes || config.nodes.mainnet)];
		this.defaultTestnetNodes = [...(options.nodes || config.nodes.testnet)];
		this.bannedNodes = [...(options.bannedNodes || [])];

		this.port =
			options.port === '' || options.port
				? options.port
				: this.getDefaultPort();
		this.randomizeNodes =
			options.randomizeNodes !== undefined ? options.randomizeNodes : true;
		this.providedNode = options.node || null;
		this.node = options.node || this.selectNewNode();
		this.headers = this.getDefaultHeaders(nethash);

		// API Resource definition
		this.accounts = new resources.AccountResource(this);
		this.blocks = new resources.BlockResource(this);
		this.dapps = new resources.DappResource(this);
		this.delegates = new resources.DelegateResource(this);
		this.signatures = new resources.SignatureResource(this);
		this.transactions = new resources.TransactionResource(this);
		this.voters = new resources.VoterResource(this);
		this.votes = new resources.VoteResource(this);
	}

	get allNodes() {
		return {
			current: this.node,
			default: this.defaultNodes,
			testnet: this.defaultTestnetNodes,
		};
	}

	get currentNodes() {
		if (this.testnet) {
			return this.defaultTestnetNodes;
		}
		return this.defaultNodes;
	}

	get urlPrefix() {
		if (this.ssl) {
			return 'https';
		}
		return 'http';
	}

	get fullURL() {
		const nodeUrl = this.port ? `${this.node}:${this.port}` : this.node;
		return `${this.urlPrefix}://${nodeUrl}`;
	}

	getDefaultHeaders(providedNethash) {
		const headers = Object.assign({}, commonHeaders, {
			port: this.port,
			nethash: this.testnet ? TESTNET_NETHASH : MAINNET_NETHASH,
		});
		if (providedNethash) {
			headers.nethash = providedNethash;
			headers.version = '0.0.0a';
		}
		return headers;
	}

	getDefaultPort() {
		if (this.testnet) {
			return TEST_PORT;
		}
		if (this.ssl) {
			return SSL_PORT;
		}
		return LIVE_PORT;
	}

	getRandomNode() {
		const nodes = this.currentNodes.filter(node => !this.isBanned(node));

		if (!nodes.length || nodes.length === 0) {
			throw new Error(
				'Cannot get random node: all relevant nodes have been banned.',
			);
		}

		const randomIndex = Math.floor(Math.random() * nodes.length);
		return nodes[randomIndex];
	}

	setSSL(newSSLValue) {
		if (this.ssl !== newSSLValue) {
			const nonSSLPort = this.testnet ? TEST_PORT : LIVE_PORT;

			this.ssl = newSSLValue;
			this.port = newSSLValue ? SSL_PORT : nonSSLPort;
			this.bannedNodes = [];

			this.selectNewNode();
		}
	}

	setTestnet(newTestnetValue) {
		if (this.testnet !== newTestnetValue) {
			const nonTestnetPort = this.ssl ? SSL_PORT : LIVE_PORT;

			this.testnet = newTestnetValue;
			this.port = newTestnetValue ? TEST_PORT : nonTestnetPort;
			this.bannedNodes = [];

			this.selectNewNode();
		}
	}

	banActiveNode() {
		if (!this.isBanned(this.node)) {
			this.bannedNodes.push(this.node);
			return true;
		}
		return false;
	}

	banActiveNodeAndSelect() {
		const banned = this.banActiveNode();
		if (banned) {
			this.node = this.selectNewNode();
		}
		return banned;
	}

	hasAvailableNodes() {
		return this.randomizeNodes
			? this.currentNodes.some(node => !this.isBanned(node))
			: false;
	}

	isBanned(node) {
		return this.bannedNodes.includes(node);
	}

	selectNewNode() {
		if (this.randomizeNodes) {
			return this.getRandomNode();
		} else if (this.providedNode) {
			if (this.isBanned(this.providedNode)) {
				throw new Error(
					'Cannot select node: provided node has been banned and randomizeNodes is not set to true.',
				);
			}
			return this.providedNode;
		}

		throw new Error(
			'Cannot select node: no node provided and randomizeNodes is not set to true.',
		);
	}
}
