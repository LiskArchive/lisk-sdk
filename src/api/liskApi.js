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
import config from '../../config.json';
import { extend } from './utils';
import cryptoModule from '../transactions/crypto';

const LiskJS = {
	crypto: cryptoModule,
};
const GET = 'GET';
const POST = 'POST';

function LiskAPI(providedOptions = {}) {
	if (!(this instanceof LiskAPI)) {
		return new LiskAPI(providedOptions);
	}

	const options = extend(config.options, providedOptions);
	const getDefaultPort = () => {
		if (options.testnet) return 7000;
		if (options.ssl) return 443;
		return 8000;
	};

	this.defaultPeers = options.peers || config.peers.mainnet;

	this.defaultSSLPeers = this.defaultPeers;

	this.defaultTestnetPeers = options.peers || config.peers.testnet;

	this.options = options;
	this.ssl = options.ssl;
	// Random peer can be set by settings with randomPeer: true | false
	// Random peer is automatically enabled when no options.node has been entered. Else will be set
	// to false.
	// If the desired behaviour is to have an own node and automatic peer discovery, randomPeer
	// should be set to true explicitly
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

LiskAPI.prototype.getNethash = function getNethash(providedNethash) {
	const NetHash = this.testnet
		? privateApi.netHashOptions.call(this).testnet
		: privateApi.netHashOptions.call(this).mainnet;

	if (providedNethash) {
		NetHash.nethash = providedNethash;
		NetHash.version = '0.0.0a';
	}

	return NetHash;
};

/**
 * @method getPeers
 * @return {object}
 */

LiskAPI.prototype.getPeers = function getPeers() {
	return {
		official: this.defaultPeers.map(node => ({ node })),
		ssl: this.defaultSSLPeers.map(node => ({ node, ssl: true })),
		testnet: this.defaultTestnetPeers.map(node => ({ node, testnet: true })),
	};
};

/**
 * @method setNode
 * @param node string
 * @return {object}
 */

LiskAPI.prototype.setNode = function setNode(node) {
	this.currentPeer = node || privateApi.selectNode.call(this);
	return this.currentPeer;
};

/**
 * @method setTestnet
 * @param testnet boolean
 */

LiskAPI.prototype.setTestnet = function setTestnet(testnet) {
	if (this.testnet !== testnet) {
		this.testnet = testnet;
		this.bannedPeers = [];
		this.port = 7000;
		privateApi.selectNode.call(this);
	} else {
		this.testnet = false;
		this.bannedPeers = [];
		this.port = 8000;
		privateApi.selectNode.call(this);
	}
};

/**
 * @method setSSL
 * @param ssl boolean
 */

LiskAPI.prototype.setSSL = function setSSL(ssl) {
	if (this.ssl !== ssl) {
		this.ssl = ssl;
		this.bannedPeers = [];
		privateApi.selectNode.call(this);
	}
};

function handleTimestampIsInFutureFailures(requestMethod, requestType, options, result) {
	if (!result.success && result.message && result.message.match(/Timestamp is in the future/) && !(options.timeOffset > 40)) {
		const newOptions = {};

		Object.keys(options).forEach((key) => {
			newOptions[key] = options[key];
		});
		newOptions.timeOffset = (options.timeOffset || 0) + 10;

		return this.sendRequest(requestMethod, requestType, newOptions);
	}
	return Promise.resolve(result);
}

function handleSendRequestFailures(requestMethod, requestType, options, error) {
	const that = this;
	if (privateApi.checkReDial.call(that)) {
		return new Promise(((resolve, reject) => {
			setTimeout(() => {
				privateApi.banNode.call(that);
				that.setNode();
				that.sendRequest(requestMethod, requestType, options)
					.then(resolve, reject);
			}, 1000);
		}));
	}
	return Promise.resolve({
		success: false,
		error,
		message: 'could not create http request to any of the given peers',
	});
}

function optionallyCallCallback(callback, result) {
	if (callback && (typeof callback === 'function')) {
		callback(result);
	}
	return result;
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

LiskAPI.prototype.sendRequest = function sendRequest(
	requestMethod = GET, requestType, optionsOrCallback, callbackIfOptions,
) {
	const callback = callbackIfOptions || optionsOrCallback;
	const options = typeof optionsOrCallback !== 'function' && typeof optionsOrCallback !== 'undefined' ? privateApi.checkOptions.call(this, optionsOrCallback) : {};
	return privateApi.sendRequestPromise.call(this, requestMethod, requestType, options)
		.then(result => result.body)
		.then(handleTimestampIsInFutureFailures.bind(this, requestMethod, requestType, options))
		.catch(handleSendRequestFailures.bind(this, requestMethod, requestType, options))
		.then(optionallyCallCallback.bind(this, callback));
};

/**
 * @method getAddressFromSecret
 * @param secret
 *
 * @return keys object
 */

LiskAPI.prototype.getAddressFromSecret = function getAddressFromSecret(secret) {
	const accountKeys = LiskJS.crypto.getKeys(secret);
	const accountAddress = LiskJS.crypto.getAddress(accountKeys.publicKey);

	return {
		address: accountAddress,
		publicKey: accountKeys.publicKey,
	};
};

/**
 * @method getAccount
 * @param address
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getAccount = privateApi.wrapSendRequest(GET, 'accounts', address => ({ address }));

/**
 * @method getActiveDelegates
 * @param limit
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getActiveDelegates = privateApi.wrapSendRequest(GET, 'delegates', limit => ({ limit }));

/**
 * @method getStandbyDelegates
 * @param limit
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getStandbyDelegates = privateApi.wrapSendRequest(GET, 'delegates', (limit, { orderBy = 'rate:asc', offset = 101 }) => ({ limit, orderBy, offset }));

/**
 * @method searchDelegateByUsername
 * @param username
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.searchDelegatesByUsername = privateApi.wrapSendRequest(GET, 'delegates/search', username => ({ username }));

/**
 * @method getBlocks
 * @param limit
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getBlocks = privateApi.wrapSendRequest(GET, 'blocks', limit => ({ limit }));

/**
 * @method getForgedBlocks
 * @param generatorPublicKey
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getForgedBlocks = privateApi.wrapSendRequest(GET, 'blocks', generatorPublicKey => ({ generatorPublicKey }));

/**
 * @method getBlock
 * @param height
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getBlock = privateApi.wrapSendRequest(GET, 'blocks', height => ({ height }));

/**
 * @method getTransactions
 * @param recipientId
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getTransactions = privateApi.wrapSendRequest(GET, 'transactions', recipientId => ({ recipientId }));

/**
 * @method getTransaction
 * @param id
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getTransaction = privateApi.wrapSendRequest(GET, 'transactions/get', id => ({ id }));

/**
 * @method getVotes
 * @param address
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getVotes = privateApi.wrapSendRequest(GET, 'accounts/delegates', address => ({ address }));

/**
 * @method getVoters
 * @param publicKey
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getVoters = privateApi.wrapSendRequest(GET, 'delegates/voters', publicKey => ({ publicKey }));

/**
 * @method listMultisignatureTransactions
 * @param data
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getMultisignatureTransactions = privateApi.wrapSendRequest(GET, 'transactions/multisignatures', data => data);

/**
 * @method getMultisignatureTransaction
 * @param id
 * @param optionsOrCallback
 * @param callbackIfOptions
 *
 * @return API object
 */

LiskAPI.prototype.getMultisignatureTransaction = privateApi.wrapSendRequest(GET, 'transactions/multisignatures/get', id => ({ id }));

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

LiskAPI.prototype.sendLSK = function sendLSK(
	recipientId, amount, secret, secondSecret, callback,
) {
	return this.sendRequest(POST, 'transactions', { recipientId, amount, secret, secondSecret }, callback);
};

/**
 * @method broadcastSignedTransaction
 * @param transaction
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.broadcastSignedTransaction = function broadcastSignedTransaction(
	transaction, callback,
) {
	const request = {
		requestMethod: POST,
		requestUrl: `${privateApi.getFullUrl.call(this)}/peer/transactions`,
		nethash: this.nethash,
		requestParams: { transaction },
	};

	privateApi.sendRequestPromise.call(this, POST, request).then(result => callback(result.body));
};

module.exports = LiskAPI;
