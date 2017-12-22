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
import { LIVE_PORT, TEST_PORT, SSL_PORT, GET, POST } from 'constants';
import config from '../../config.json';
import * as privateApi from './privateApi';
import * as utils from './utils';

const bannedNodes = Symbol('bannedNodes');
const defaultNodes = Symbol('defaultNodes');
const defaultSSLNodes = Symbol('defaultSSLNodes');
const defaultTestnetNodes = Symbol('defaultTestnetNodes');
const nethash = Symbol('nethash');
const ssl = Symbol('ssl');
const testnet = Symbol('testnet');

export default class LiskAPI {
	constructor(providedOptions) {
		const options = Object.assign({}, config.options, providedOptions);

		this[ssl] = [true, false].includes(options.ssl) ? options.ssl : true;
		this[testnet] = options.testnet || false;
		this[nethash] = this.getNethash(options.nethash);

		this[defaultNodes] = [...(options.nodes || config.nodes.mainnet)];
		this[defaultSSLNodes] = [...this[defaultNodes]];
		this[defaultTestnetNodes] = [...(options.nodes || config.nodes.testnet)];
		this[bannedNodes] = [...options.bannedNodes] || [];

		this.port =
			options.port === '' || options.port
				? options.port
				: utils.getDefaultPort(options);
		this.randomizeNodes = [true, false].includes(options.randomizeNodes)
			? options.randomizeNodes
			: true;
		this.providedNode = options.node || null;
		this.node = options.node || this.selectNewNode();
	}

	get allNodes() {
		return {
			current: this.node,
			default: this[defaultNodes],
			ssl: this[defaultSSLNodes],
			testnet: this[defaultTestnetNodes],
		};
	}

	get nodes() {
		if (this.testnet) return this[defaultTestnetNodes];
		if (this.ssl) return this[defaultSSLNodes];
		return this[defaultNodes];
	}

	get randomNode() {
		const nodes = this.nodes.filter(node => !this.isBanned(node));

		if (!nodes.length) {
			throw new Error(
				'Cannot get random node: all relevant nodes have been banned.',
			);
		}

		const randomIndex = Math.floor(Math.random() * nodes.length);
		return nodes[randomIndex];
	}

	get ssl() {
		return this[ssl];
	}

	set ssl(newSSLValue) {
		if (this.ssl !== newSSLValue) {
			const nonSSLPort = this.testnet ? TEST_PORT : LIVE_PORT;

			this[ssl] = newSSLValue;
			this.port = newSSLValue ? SSL_PORT : nonSSLPort;
			this[bannedNodes] = [];

			this.selectNewNode();
		}
	}

	get testnet() {
		return this[testnet];
	}

	set testnet(newTestnetValue) {
		if (this.testnet !== newTestnetValue) {
			const nonTestnetPort = this.ssl ? SSL_PORT : LIVE_PORT;

			this[testnet] = newTestnetValue;
			this.port = newTestnetValue ? TEST_PORT : nonTestnetPort;
			this[bannedNodes] = [];

			this.selectNewNode();
		}
	}

	banActiveNode() {
		if (!this.isBanned(this.node)) {
			this[bannedNodes].push(this.node);
			this.node = this.selectNewNode();
			return true;
		}
		return false;
	}

	broadcastSignatures(signatures, callback) {
		const request = {
			requestUrl: `${utils.getFullURL(this)}/api/signatures`,
			nethash: this.nethash,
			requestParams: { signatures },
		};
		return privateApi.sendRequestPromise
			.call(this, POST, request)
			.then(result => result.body)
			.then(utils.optionallyCallCallback.bind(null, callback));
	}

	broadcastSignedTransaction(transaction, callback) {
		const request = {
			requestUrl: `${utils.getFullURL(this)}/api/transactions`,
			nethash: this.nethash,
			requestParams: { transaction },
		};

		return privateApi.sendRequestPromise
			.call(this, POST, request)
			.then(result => result.body)
			.then(utils.optionallyCallCallback.bind(null, callback));
	}

	getNethash(providedNethash) {
		const { port } = this;
		const NetHash = this.testnet
			? utils.netHashOptions({ port }).testnet
			: utils.netHashOptions({ port }).mainnet;

		if (providedNethash) {
			NetHash.nethash = providedNethash;
			NetHash.version = '0.0.0a';
		}

		return NetHash;
	}

	hasAvailableNodes() {
		return this.randomizeNodes
			? this.nodes.some(node => !this.isBanned(node))
			: false;
	}

	isBanned(node) {
		return this[bannedNodes].includes(node);
	}

	selectNewNode() {
		if (this.randomizeNodes) {
			return this.randomNode;
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

	sendRequest(
		requestMethod,
		requestType,
		optionsOrCallback,
		callbackIfOptions,
	) {
		const callback = callbackIfOptions || optionsOrCallback;
		const options =
			typeof optionsOrCallback !== 'function' &&
			typeof optionsOrCallback !== 'undefined'
				? utils.checkOptions(optionsOrCallback)
				: {};

		return privateApi.sendRequestPromise
			.call(this, requestMethod, requestType, options)
			.then(result => result.body)
			.then(
				privateApi.handleTimestampIsInFutureFailures.bind(
					this,
					requestMethod,
					requestType,
					options,
				),
			)
			.catch(
				privateApi.handleSendRequestFailures.bind(
					this,
					requestMethod,
					requestType,
					options,
				),
			)
			.then(utils.optionallyCallCallback.bind(null, callback));
	}

	transferLSK(recipientId, amount, passphrase, secondPassphrase, callback) {
		return this.sendRequest(
			POST,
			'transactions',
			{ recipientId, amount, passphrase, secondPassphrase },
			callback,
		);
	}
}

[
	['getAccount', 'accounts', address => ({ address })],
	['getActiveDelegates', 'delegates', limit => ({ limit })],
	['getBlock', 'blocks', height => ({ height })],
	['getBlocks', 'blocks', limit => ({ limit })],
	['getDapp', 'dapps', transactionId => ({ transactionId })],
	['getDapps', 'dapps', data => data],
	['getDappsByCategory', 'dapps', category => ({ category })],
	['getForgedBlocks', 'blocks', generatorPublicKey => ({ generatorPublicKey })],
	[
		'getStandbyDelegates',
		'delegates',
		(limit, { orderBy = 'rate:asc', offset = 101 }) => ({
			limit,
			orderBy,
			offset,
		}),
	],
	['getTransaction', 'transactions', transactionId => ({ transactionId })],
	['getTransactions', 'transactions', recipientId => ({ recipientId })],
	[
		'getUnsignedMultisignatureTransactions',
		'transactions/unsigned',
		data => data,
	],
	['getVoters', 'voters', username => ({ username })],
	['getVotes', 'votes', address => ({ address })],
	['searchDelegatesByUsername', 'delegates', search => ({ search })],
].forEach(([methodName, endpoint, getDataFunction]) => {
	LiskAPI.prototype[methodName] = utils.wrapSendRequest(
		GET,
		endpoint,
		getDataFunction,
	);
});
