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
 * LiskAPI module provides functions for interfacing with the Lisk network. Providing mechanisms for:
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

var LiskJS = {};
LiskJS.crypto = require('../transactions/crypto');
var parseOfflineRequest = require('./parseTransaction');
var privateApi = require('./privateApi');
var config = require('../../config.json');
var extend = require('./utils').extend;

function LiskAPI (options) {
	if (!(this instanceof LiskAPI)) {
		return new LiskAPI(options);
	}

	options = extend(config.options, (options || {}));

	this.defaultPeers = options.peers || config.peers.mainnet;

	this.defaultSSLPeers = this.defaultPeers;

	this.defaultTestnetPeers = options.peers || config.peers.testnet;

	this.options = options;
	this.ssl = options.ssl;
	// Random peer can be set by settings with randomPeer: true | false
	// Random peer is automatically enabled when no options.node has been entered. Else will be set to false
	// If the desired behaviour is to have an own node and automatic peer discovery, randomPeer should be set to true explicitly
	this.randomPeer = (typeof options.randomPeer === 'boolean') ? options.randomPeer : !(options.node);
	this.testnet = options.testnet;
	this.bannedPeers = options.bannedPeers;
	this.currentPeer = options.node || privateApi.selectNode.call(this);
	this.port = (options.port === '' || options.port) ? options.port : (options.testnet ? 7000 : (options.ssl ? 443 : 8000));
	this.parseOfflineRequests = parseOfflineRequest;
	this.nethash = this.getNethash(options.nethash);
}

/**
 * @method getNethash
 * @return {object}
 * @public
 */

LiskAPI.prototype.getNethash = function (providedNethash) {
	var NetHash = (this.testnet) ? privateApi.netHashOptions.call(this).testnet : privateApi.netHashOptions.call(this).mainnet;

	if (providedNethash) {
		NetHash.nethash = providedNethash;
		NetHash.version = '0.0.0a';
	}

	return NetHash;
};

/**
 * @method listPeers
 * @return {object}
 */

LiskAPI.prototype.listPeers = function () {
	return {
		official: this.defaultPeers.map(function (node) { return {node: node};}),
		ssl: this.defaultSSLPeers.map(function (node) { return {node: node, ssl: true};}),
		testnet: this.defaultTestnetPeers.map(function (node) { return {node: node, testnet: true};}),
	};
};

/**
 * @method setNode
 * @param node string
 * @return {object}
 */

LiskAPI.prototype.setNode = function (node) {
	this.currentPeer = node || privateApi.selectNode.call(this);
	return this.currentPeer;
};

/**
 * @method setTestnet
 * @param testnet boolean
 */

LiskAPI.prototype.setTestnet = function (testnet) {
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

LiskAPI.prototype.setSSL = function (ssl) {
	if (this.ssl !== ssl) {
		this.ssl = ssl;
		this.bannedPeers = [];
		privateApi.selectNode.call(this);
	}
};

function parseResponse (requestType, options, requestSuccess) {
	var parser = parseOfflineRequest(requestType, options);
	return parser.requestMethod === 'GET'
		? requestSuccess.body
		: parser.transactionOutputAfter(requestSuccess.body);
}

function handleTimestampIsInFutureFailures (requestType, options, result) {
	if (!result.success && result.message.match(/Timestamp is in the future/) && !(options.timeOffset > 40e3)) {
		var newOptions = {};

		Object.keys(options).forEach(function (key) {
			newOptions[key] = options[key];
		});
		newOptions.timeOffset = (options.timeOffset || 0) + 10e3;

		return this.sendRequest(requestType, newOptions);
	}
	return Promise.resolve(result);
}

function handleSendRequestFailures (requestType, options, error) {
	var that = this;
	if (privateApi.checkReDial.call(that)) {
		return new Promise(function (resolve, reject) {
			setTimeout(function () {
				privateApi.banNode.call(that);
				that.setNode();
				that.sendRequest(requestType, options)
					.then(resolve, reject);
			}, 1000);
		});
	}
	return Promise.resolve({
		success: false,
		error: error,
		message: 'could not create http request to any of the given peers'
	});
}

function optionallyCallCallback (callback, result) {
	if (callback && (typeof callback === 'function')) {
		callback(result);
	}
	return result;
}

/**
 * @method sendRequest
 * @param requestType
 * @param options
 * @param callback
 *
 * @return APIanswer Object
 */

LiskAPI.prototype.sendRequest = function (requestType, options, callback) {
	callback = callback || options;
	options = typeof options !== 'function' && typeof options !== 'undefined' ? privateApi.checkOptions.call(this, options) : {};

	return privateApi.sendRequestPromise.call(this, requestType, options)
		.then(parseResponse.bind(this, requestType, options))
		.then(handleTimestampIsInFutureFailures.bind(this, requestType, options))
		.catch(handleSendRequestFailures.bind(this, requestType, options))
		.then(optionallyCallCallback.bind(this, callback));
};

/**
 * @method getAddressFromSecret
 * @param secret
 *
 * @return keys object
 */

LiskAPI.prototype.getAddressFromSecret = function (secret) {
	var accountKeys = LiskJS.crypto.getKeys(secret);
	var accountAddress = LiskJS.crypto.getAddress(accountKeys.publicKey);

	return {
		address: accountAddress,
		publicKey: accountKeys.publicKey
	};
};

/**
 * @method getAccount
 * @param address
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.getAccount = function (address, callback) {
	return this.sendRequest('accounts', { address: address }, function (result) {
		return callback(result);
	});
};

/**
 * @method generateAccount
 * @param secret
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.generateAccount = function (secret, callback) {
	var keys = LiskJS.crypto.getPrivateAndPublicKeyFromSecret(secret);
	callback(keys);
	return this;
};

/**
 * @method listActiveDelegates
 * @param limit
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.listActiveDelegates = function (limit, callback) {
	this.sendRequest('delegates/', { limit: limit}, function (result) {
		return callback(result);
	});
};

/**
 * @method listStandbyDelegates
 * @param limit
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.listStandbyDelegates = function (limit, callback) {
	var standByOffset = 101;

	this.sendRequest('delegates/', { limit: limit, orderBy: 'rate:asc', offset: standByOffset}, function (result) {
		return callback(result);
	});
};

/**
 * @method searchDelegateByUsername
 * @param username
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.searchDelegateByUsername = function (username, callback) {
	this.sendRequest('delegates/search/', { q: username }, function (result) {
		return callback(result);
	});
};

/**
 * @method listBlocks
 * @param amount
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.listBlocks = function (amount, callback) {
	this.sendRequest('blocks', { limit: amount }, function (result) {
		return callback(result);
	});
};

/**
 * @method listForgedBlocks
 * @param publicKey
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.listForgedBlocks = function (publicKey, callback) {
	this.sendRequest('blocks', { generatorPublicKey: publicKey }, function (result) {
		return callback(result);
	});
};

/**
 * @method getBlock
 * @param block
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.getBlock = function (block, callback) {
	this.sendRequest('blocks', { height: block }, function (result) {
		return callback(result);
	});
};

/**
 * @method listTransactions
 * @param address
 * @param limit
 * @param offset
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.listTransactions = function (address, limit, offset, callback) {
	offset = offset || '0';
	limit = limit || '20';
	this.sendRequest('transactions', { senderId: address, recipientId: address, limit: limit, offset: offset, orderBy: 'timestamp:desc' }, function (result) {
		return callback(result);
	});
};

/**
 * @method getTransaction
 * @param transactionId
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.getTransaction = function (transactionId, callback) {
	this.sendRequest('transactions/get', { id: transactionId }, function (result) {
		return callback(result);
	});
};

/**
 * @method listVotes
 * @param address
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.listVotes = function (address, callback) {
	this.sendRequest('accounts/delegates', { address: address }, function (result) {
		return callback(result);
	});
};

/**
 * @method listVoters
 * @param publicKey
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.listVoters = function (publicKey, callback) {
	this.sendRequest('delegates/voters', { publicKey: publicKey }, function (result) {
		return callback(result);
	});
};

/**
 * @method sendLSK
 * @param recipient
 * @param amount
 * @param secret
 * @param secondSecret
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.sendLSK = function (recipient, amount, secret, secondSecret, callback) {
	this.sendRequest('transactions', { recipientId: recipient, amount: amount, secret: secret, secondSecret: secondSecret }, function (response) {
		return callback(response);
	});
};

/**
 * @method listMultisignatureTransactions
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.listMultisignatureTransactions = function (callback) {
	this.sendRequest('transactions/multisignatures', function (result) {
		return callback(result);
	});
};

/**
 * @method getMultisignatureTransaction
 * @param transactionId
 * @param callback
 *
 * @return API object
 */

LiskAPI.prototype.getMultisignatureTransaction = function (transactionId, callback) {
	this.sendRequest('transactions/multisignatures/get', { id: transactionId }, function (result) {
		return callback(result);
	});
};

LiskAPI.prototype.broadcastSignedTransaction = function (transaction, callback) {

	var request = {
		requestMethod: 'POST',
		requestUrl: privateApi.getFullUrl.call(this) + '/peer/' + 'transactions',
		nethash: this.nethash,
		requestParams: { transaction }
	};

	privateApi.doPopsicleRequest.call(this, request).then(function (result) {
		return callback(result.body);
	});

};

module.exports = LiskAPI;
