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
 * - Connecting to Lisk peers or to localhost instance of Lisk core.
 * - Configurable network settings to work in different Lisk environments.
 *
 *     var options = {
 *         ssl: false,
 *         node: '',
 *         randomPeer: true,
 *         testnet: true,
 *         port: '7000',
 *         bannedPeers: [],
 *         peers: [],
 *         nethash: ''
 *     };
 *
 *     var lisk = require('lisk-js');
 *     var LSK = lisk.api(options);
 *
 * @class lisk.api()
 * @main lisk
 */
import privateApi from './privateApi';
import { checkOptions, optionallyCallCallback, wrapSendRequest } from './utils';
import config from '../../config.json';

const GET = 'GET';
const POST = 'POST';

const livePort = 8000;
const testPort = 7000;
const sslPort = 443;

const getDefaultPort = (options) => {
	if (options.testnet) return testPort;
	if (options.ssl) return sslPort;
	return livePort;
};

class LiskAPI {
	constructor(providedOptions) {
		const options = Object.assign({}, config.options, providedOptions);

		this.defaultPeers = options.peers || config.peers.mainnet;

		this.defaultSSLPeers = this.defaultPeers;

		this.defaultTestnetPeers = options.peers || config.peers.testnet;

		this.options = options;
		this.ssl = options.ssl;
		this.randomPeer = (typeof options.randomPeer === 'boolean') ? options.randomPeer : !(options.node);
		this.testnet = options.testnet;
		this.bannedPeers = options.bannedPeers;
		this.currentPeer = options.node || privateApi.selectNode.call(this);
		this.port = (options.port === '' || options.port)
			? options.port
			: getDefaultPort(options);
		this.nethash = this.getNethash(options.nethash);
	}

	/**
	 * @method getNethash
	 * @return {object}
	 * @public
	 */

	getNethash(providedNethash) {
		const NetHash = this.testnet
			? privateApi.netHashOptions.call(this).testnet
			: privateApi.netHashOptions.call(this).mainnet;

		if (providedNethash) {
			NetHash.nethash = providedNethash;
			NetHash.version = '0.0.0a';
		}

		return NetHash;
	}

	/**
	 * @method getPeers
	 * @return {object}
	 */

	getPeers() {
		return {
			official: this.defaultPeers.map(node => ({ node })),
			ssl: this.defaultSSLPeers.map(node => ({ node, ssl: true })),
			testnet: this.defaultTestnetPeers.map(node => ({ node, testnet: true })),
		};
	}

	/**
	 * @method setNode
	 * @param node string
	 * @return {object}
	 */

	setNode(node) {
		this.currentPeer = node || privateApi.selectNode.call(this);
		return this.currentPeer;
	}

	/**
	 * @method setTestnet
	 * @param testnet boolean
	 */

	setTestnet(testnet) {
		if (this.testnet !== testnet) {
			this.bannedPeers = [];
		}
		this.testnet = testnet;
		this.port = testnet ? testPort : livePort;

		privateApi.selectNode.call(this);
	}

	/**
	 * @method setSSL
	 * @param ssl boolean
	 */

	setSSL(ssl) {
		if (this.ssl !== ssl) {
			this.ssl = ssl;
			this.bannedPeers = [];
			privateApi.selectNode.call(this);
		}
	}

	/**
	 * @method broadcastSignedTransaction
	 * @param transaction
	 * @param callback
	 *
	 * @return API object
	 */

	broadcastSignedTransaction(transaction, callback) {
		const request = {
			requestUrl: `${privateApi.getFullURL.call(this)}/api/transactions`,
			nethash: this.nethash,
			requestParams: { transaction },
		};

		privateApi.sendRequestPromise.call(this, POST, request).then(result => callback(result.body));
	}

	/**
	 * @method sendRequest
	 * @param requestMethod
	 * @param requestType
	 * @param optionsOrCallback
	 * @param callbackIfOptions
	 *
	 * @return APIanswer Object
	 */

	sendRequest(requestMethod, requestType, optionsOrCallback, callbackIfOptions) {
		const callback = callbackIfOptions || optionsOrCallback;
		const options = (typeof optionsOrCallback !== 'function' && typeof optionsOrCallback !== 'undefined')
			? checkOptions(optionsOrCallback)
			: {};

		return privateApi.sendRequestPromise.call(this, requestMethod, requestType, options)
			.then(result => result.body)
			.then(privateApi.handleTimestampIsInFutureFailures.bind(
				this, requestMethod, requestType, options,
			))
			.catch(privateApi.handleSendRequestFailures.bind(this, requestMethod, requestType, options))
			.then(optionallyCallCallback.bind(null, callback));
	}

	/**
	 * @method sendLSK
	 * @param recipientId
	 * @param amount
	 * @param secret
	 * @param secondSecret
	 * @param callback
	 *
	 * @return API object
	 */

	sendLSK(recipientId, amount, secret, secondSecret, callback) {
		return this.sendRequest(POST, 'transactions', { recipientId, amount, secret, secondSecret }, callback);
	}
}

/**
 * @method getAccount
 * @param address
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getAccount = wrapSendRequest(GET, 'accounts', address => ({ address }));

/**
 * @method getActiveDelegates
 * @param limit
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getActiveDelegates = wrapSendRequest(GET, 'delegates', limit => ({ limit }));

/**
 * @method getStandbyDelegates
 * @param limit
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getStandbyDelegates = wrapSendRequest(GET, 'delegates', (limit, { orderBy = 'rate:asc', offset = 101 }) => ({ limit, orderBy, offset }));

/**
 * @method searchDelegatesByUsername
 * @param username
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.searchDelegatesByUsername = wrapSendRequest(GET, 'delegates', search => ({ search }));

/**
 * @method getBlocks
 * @param limit
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getBlocks = wrapSendRequest(GET, 'blocks', limit => ({ limit }));

/**
 * @method getForgedBlocks
 * @param generatorPublicKey
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getForgedBlocks = wrapSendRequest(GET, 'blocks', generatorPublicKey => ({ generatorPublicKey }));

/**
 * @method getBlock
 * @param height
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getBlock = wrapSendRequest(GET, 'blocks', height => ({ height }));

/**
 * @method getTransactions
 * @param recipientId
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getTransactions = wrapSendRequest(GET, 'transactions', recipientId => ({ recipientId }));

/**
 * @method getTransaction
 * @param transactionId
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getTransaction = wrapSendRequest(GET, 'transactions', transactionId => ({ transactionId }));

/**
 * @method getVotes
 * @param address
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getVotes = wrapSendRequest(GET, 'votes', address => ({ address }));

/**
 * @method getVoters
 * @param username
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getVoters = wrapSendRequest(GET, 'voters', username => ({ username }));

/**
 * @method getUnsignedMultisignatureTransactions
 * @param data
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getUnsignedMultisignatureTransactions = wrapSendRequest(GET, 'transactions/unsigned', data => data);

/**
 * @method getDapp
 * @param transactionId
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getDapp = wrapSendRequest(GET, 'dapps', transactionId => ({ transactionId }));

/**
 * @method getDapps
 * @param data
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getDapps = wrapSendRequest(GET, 'dapps', data => data);

/**
 * @method getDappsByCategory
 * @param category
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getDappsByCategory = wrapSendRequest(GET, 'dapps', category => ({ category }));


module.exports = LiskAPI;
