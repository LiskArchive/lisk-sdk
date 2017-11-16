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

/**
 * LiskAPI module provides functions for interfacing with the Lisk network.
 * Providing mechanisms for:
 *
 * - Retrieval of blockchain data: accounts, blocks, transactions.
 * - Enhancing Lisk security by local signing of transactions and immediate network transmission.
 * - Connecting to Lisk nodes or to localhost instance of Lisk core.
 * - Configurable network settings to work in different Lisk environments.
 *
 *     var lisk = require('lisk-js');
 *
 *     var options = {
 *         ssl: false,
 *         node: '',
 *         randomNode: true,
 *         testnet: true,
 *         port: '7000',
 *         bannedNodes: [],
 *         nodes: [],
 *         nethash: ''
 *     };
 *
 *
 *     var LSK = lisk.api(options);
*/
import * as privateApi from './privateApi';
import * as utils from './utils';
import config from '../../config.json';

const GET = 'GET';
const POST = 'POST';

const livePort = 8000;
const testPort = 7000;
const sslPort = 443;

const getDefaultPort = options => {
	if (options.testnet) return testPort;
	if (options.ssl) return sslPort;
	return livePort;
};

/**
*
* @class LiskAPI
* @param {Object} options - Initialization Object for the LiskAPI instance.
 */

export default class LiskAPI {
	constructor(providedOptions) {
		const options = Object.assign({}, config.options, providedOptions);

		this.defaultNodes = options.nodes || config.nodes.mainnet;

		this.defaultSSLNodes = this.defaultNodes;

		this.defaultTestnetNodes = options.nodes || config.nodes.testnet;

		this.options = options;
		this.ssl = options.ssl;
		this.randomNode = Boolean(options.randomNode);
		this.testnet = options.testnet;
		this.bannedNodes = options.bannedNodes;
		this.node = options.node || privateApi.selectNewNode.call(this);
		this.port =
			options.port === '' || options.port
				? options.port
				: getDefaultPort(options);
		this.nethash = this.getNethash(options.nethash);
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
	 * @method getNodes
	 * @return {Object}
	 */

	getNodes() {
		return {
			official: this.defaultNodes.map(node => ({ node })),
			ssl: this.defaultSSLNodes.map(node => ({ node, ssl: true })),
			testnet: this.defaultTestnetNodes.map(node => ({
				node,
				testnet: true,
			})),
		};
	}

	/**
	 * @method setNode
	 * @param {String} node
	 * @return {Object}
	 */

	setNode(node) {
		this.node = node || privateApi.selectNewNode.call(this);
		return this.node;
	}

	/**
	 * @method setTestnet
	 * @param {Boolean} testnet
	 */

	setTestnet(testnet) {
		if (this.testnet !== testnet) {
			this.bannedNodes = [];
		}
		this.testnet = testnet;
		this.port = testnet ? testPort : livePort;

		privateApi.selectNewNode.call(this);
	}

	/**
	 * @method setSSL
	 * @param {Boolean} ssl
	 */

	setSSL(ssl) {
		if (this.ssl !== ssl) {
			this.ssl = ssl;
			this.bannedNodes = [];
			privateApi.selectNewNode.call(this);
		}
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
	 * @method transferLSK
	 * @param recipientId
	 * @param amount
	 * @param secret
	 * @param secondSecret
	 * @param callback
	 *
	 * @return {Object}
	 */

	transferLSK(recipientId, amount, secret, secondSecret, callback) {
		return this.sendRequest(
			POST,
			'transactions',
			{ recipientId, amount, secret, secondSecret },
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
