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

/**
*
* @class LiskAPI
* @param {Object} options - Initialization Object for the LiskAPI instance.
 */

export default class LiskAPI {
	constructor(providedOptions) {
		const options = Object.assign({}, config.options, providedOptions);

		this.ssl = [true, false].includes(options.ssl) ? options.ssl : true;
		this.testnet = options.testnet || false;

		this.defaultNodes = options.nodes || config.nodes.mainnet;
		this.defaultSSLNodes = this.defaultNodes;
		this.defaultTestnetNodes = options.nodes || config.nodes.testnet;

		this.randomizeNodes = [true, false].includes(options.randomizeNodes)
			? options.randomizeNodes
			: true;
		this.bannedNodes = options.bannedNodes || [];

		this.node = options.node || this.selectNewNode();
		this.providedNode = options.node || null;

		this.port =
			options.port === '' || options.port
				? options.port
				: utils.getDefaultPort(options);
		this.nethash = this.getNethash(options.nethash);
	}

	get allNodes() {
		return {
			current: this.node,
			default: this.defaultNodes,
			ssl: this.defaultSSLNodes,
			testnet: this.defaultTestnetNodes,
		};
	}

	get nodes() {
		if (this.testnet) return this.defaultTestnetNodes;
		if (this.ssl) return this.defaultSSLNodes;
		return this.defaultNodes;
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

	/**
	 * @method banActiveNode
	 * @private
	 */

	banActiveNode() {
		if (!this.isBanned(this.node)) {
			this.bannedNodes.push(this.node);
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

	/**
	 * @method broadcastSignedTransaction
	 * @param transaction
	 * @param callback
	 *
	 * @return {Object}
	 */

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

	/**
	 * @method getNethash
	 * @return {Object}
	 * @public
	 */

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

	/**
	 * @method hasAvailableNodes
	 * @return {Boolean}
	 * @private
	 */

	hasAvailableNodes() {
		return this.randomizeNodes
			? this.nodes.some(node => !this.isBanned(node))
			: false;
	}

	/**
	 * @method isBanned
	 * @return {Boolean}
	 * @private
	 */

	isBanned(node) {
		return this.bannedNodes.includes(node);
	}

	/**
	 * @method selectNewNode
	 * @return {String}
	 * @private
	 */

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

	/**
	 * @method sendRequest
	 * @param requestMethod
	 * @param requestType
	 * @param optionsOrCallback
	 * @param callbackIfOptions
	 *
	 * @return {Object}
	 */

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

	/**
	 * @method setNode
	 * @param {String} node
	 * @return {Object}
	 */

	setNode(node) {
		this.node = node || this.selectNewNode();
		return this.node;
	}

	/**
	 * @method setSSL
	 * @param {Boolean} ssl
	 */

	setSSL(ssl) {
		if (this.ssl !== ssl) {
			const nonSSLPort = this.testnet ? TEST_PORT : LIVE_PORT;

			this.ssl = ssl;
			this.port = ssl ? SSL_PORT : nonSSLPort;
			this.bannedNodes = [];

			this.selectNewNode();
		}
	}

	/**
	 * @method setTestnet
	 * @param {Boolean} testnet
	 */

	setTestnet(testnet) {
		if (this.testnet !== testnet) {
			const nonTestnetPort = this.ssl ? SSL_PORT : LIVE_PORT;

			this.testnet = testnet;
			this.port = testnet ? TEST_PORT : nonTestnetPort;
			this.bannedNodes = [];

			this.selectNewNode();
		}
	}

	/**
	 * @method transferLSK
	 * @param recipientId
	 * @param amount
	 * @param passphrase
	 * @param secondPassphrase
	 * @param callback
	 *
	 * @return {Object}
	 */

	transferLSK(recipientId, amount, passphrase, secondPassphrase, callback) {
		return this.sendRequest(
			POST,
			'transactions',
			{ recipientId, amount, passphrase, secondPassphrase },
			callback,
		);
	}
}

/**
 * @method getAccount
 * @param address
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getAccount = utils.wrapSendRequest(
	GET,
	'accounts',
	address => ({ address }),
);

/**
 * @method getActiveDelegates
 * @param limit
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getActiveDelegates = utils.wrapSendRequest(
	GET,
	'delegates',
	limit => ({ limit }),
);

/**
 * @method getBlock
 * @param height
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getBlock = utils.wrapSendRequest(GET, 'blocks', height => ({
	height,
}));

/**
 * @method getBlocks
 * @param limit
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getBlocks = utils.wrapSendRequest(GET, 'blocks', limit => ({
	limit,
}));

/**
 * @method getDapp
 * @param transactionId
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getDapp = utils.wrapSendRequest(
	GET,
	'dapps',
	transactionId => ({ transactionId }),
);

/**
 * @method getDapps
 * @param data
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getDapps = utils.wrapSendRequest(GET, 'dapps', data => data);

/**
 * @method getDappsByCategory
 * @param category
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getDappsByCategory = utils.wrapSendRequest(
	GET,
	'dapps',
	category => ({ category }),
);

/**
 * @method getForgedBlocks
 * @param generatorPublicKey
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getForgedBlocks = utils.wrapSendRequest(
	GET,
	'blocks',
	generatorPublicKey => ({ generatorPublicKey }),
);

/**
 * @method getStandbyDelegates
 * @param limit
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getStandbyDelegates = utils.wrapSendRequest(
	GET,
	'delegates',
	(limit, { orderBy = 'rate:asc', offset = 101 }) => ({
		limit,
		orderBy,
		offset,
	}),
);

/**
 * @method getTransaction
 * @param transactionId
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getTransaction = utils.wrapSendRequest(
	GET,
	'transactions',
	transactionId => ({ transactionId }),
);

/**
 * @method getTransactions
 * @param recipientId
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getTransactions = utils.wrapSendRequest(
	GET,
	'transactions',
	recipientId => ({ recipientId }),
);

/**
 * @method getUnsignedMultisignatureTransactions
 * @param data
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getUnsignedMultisignatureTransactions = utils.wrapSendRequest(
	GET,
	'transactions/unsigned',
	data => data,
);

/**
 * @method getVoters
 * @param username
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getVoters = utils.wrapSendRequest(
	GET,
	'voters',
	username => ({ username }),
);

/**
 * @method getVotes
 * @param address
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.getVotes = utils.wrapSendRequest(GET, 'votes', address => ({
	address,
}));

/**
 * @method searchDelegatesByUsername
 * @param username
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return {Object}
 */

LiskAPI.prototype.searchDelegatesByUsername = utils.wrapSendRequest(
	GET,
	'delegates',
	search => ({ search }),
);
