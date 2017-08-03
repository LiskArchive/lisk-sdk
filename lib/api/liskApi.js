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

var popsicle = require('popsicle');

function LiskAPI (options) {
	if (!(this instanceof LiskAPI)) {
		return new LiskAPI(options);
	}

	options = options || {};

	this.defaultPeers = [
		'node01.lisk.io',
		'node02.lisk.io',
		'node03.lisk.io',
		'node04.lisk.io',
		'node05.lisk.io',
		'node06.lisk.io',
		'node07.lisk.io',
		'node08.lisk.io'
	];

	this.defaultSSLPeers = this.defaultPeers;

	this.defaultTestnetPeers = [
		'testnet.lisk.io'
	];

	this.options = options;
	this.ssl = options.ssl || false;
	// Random peer can be set by settings with randomPeer: true | false
	// Random peer is automatically enabled when no options.node has been entered. Else will be set to false
	// If the desired behaviour is to have an own node and automatic peer discovery, randomPeer should be set to true explicitly
	this.randomPeer = (typeof options.randomPeer === 'boolean') ? options.randomPeer : !(options.node);
	this.testnet = options.testnet || false;
	this.bannedPeers = [];
	this.currentPeer = options.node || this.selectNode();
	this.port = (options.port === '' || options.port) ? options.port : (options.testnet ? 7000 : (options.ssl ? 443 : 8000));
	this.parseOfflineRequests = parseOfflineRequest;
	this.nethash = this.getNethash(options.nethash);
}

/**
 * @method netHashOptions
 * @return {object}
 */

LiskAPI.prototype.netHashOptions = function () {
	return {
		testnet: {
			'Content-Type': 'application/json',
			'nethash': 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			'broadhash': 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			'os': 'lisk-js-api',
			'version': '1.0.0',
			'minVersion': '>=0.5.0',
			'port': this.port
		},
		mainnet: {
			'Content-Type': 'application/json',
			'nethash': 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			'broadhash': 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			'os': 'lisk-js-api',
			'version': '1.0.0',
			'minVersion': '>=0.5.0',
			'port': this.port
		}
	};
};

/**
 * @method getNethash
 * @return {object}
 */

LiskAPI.prototype.getNethash = function (providedNethash) {
	var NetHash = (this.testnet) ? this.netHashOptions().testnet : this.netHashOptions().mainnet;

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
	this.currentPeer = node || this.selectNode();
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
		this.selectNode();
	} else {
		this.testnet = false;
		this.bannedPeers = [];
		this.port = 8000;
		this.selectNode();
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
		this.selectNode();
	}
};

/**
 * @method getFullUrl
 * @return url string
 */

LiskAPI.prototype.getFullUrl = function () {
	var nodeUrl = this.currentPeer;

	if (this.port) {
		nodeUrl += ':'+this.port;
	}

	return this.getURLPrefix() + '://' + nodeUrl;
};

/**
 * @method getURLPrefix
 * @return prefix string
 */

LiskAPI.prototype.getURLPrefix = function () {
	if (this.ssl) {
		return 'https';
	} else {
		return 'http';
	}
};

/**
 * @method selectNode
 * @return peer string
 */

LiskAPI.prototype.selectNode = function () {
	var currentRandomPeer;

	if (this.options.node) {
		currentRandomPeer = this.currentPeer;
	}

	if (this.randomPeer) {
		currentRandomPeer = this.getRandomPeer();
		var peers = (this.ssl) ? this.defaultSSLPeers : this.defaultPeers;
		if (this.testnet) peers = this.defaultTestnetPeers;

		for (var x = 0; x< peers.length; x++) {
			if (this.bannedPeers.indexOf(currentRandomPeer) === -1) break;
			currentRandomPeer = this.getRandomPeer();
		}
	}

	return currentRandomPeer;
};

/**
 * @method getRandomPeer
 * @return peer string
 */

LiskAPI.prototype.getRandomPeer = function () {
	var peers = (this.ssl) ? this.defaultSSLPeers : this.defaultPeers;
	if (this.testnet) peers = this.defaultTestnetPeers;

	var getRandomNumberForPeer = Math.floor((Math.random() * peers.length));
	return peers[getRandomNumberForPeer];
};

/**
 * @method banNode
 */

LiskAPI.prototype.banNode = function () {
	if (this.bannedPeers.indexOf(this.currentPeer) === -1) this.bannedPeers.push(this.currentPeer);
	this.selectNode();
};

/**
 * @method checkReDial
 * @return reDial boolean
 */

LiskAPI.prototype.checkReDial = function () {
	var peers = (this.ssl) ? this.defaultSSLPeers : this.defaultPeers;
	if (this.testnet) peers = this.defaultTestnetPeers;

	var reconnect = true;

	// RandomPeer discovery explicitly set
	if (this.randomPeer === true) {
		// A nethash has been set by the user. This influences internal redirection
		if (this.options.nethash) {
			// Nethash is equal to testnet nethash, we can proceed to get testnet peers
			if (this.options.nethash === this.netHashOptions().testnet.nethash) {
				this.setTestnet(true);
				reconnect = true;
			// Nethash is equal to mainnet nethash, we can proceed to get mainnet peers
			} else if (this.options.nethash === this.netHashOptions().mainnet.nethash) {
				this.setTestnet(false);
				reconnect = true;
			// Nethash is neither mainnet nor testnet, do not proceed to get peers
			} else {
				reconnect = false;
			}
		// No nethash set, we can take the usual approach, just when there are not-banned peers, take one
		} else {
			reconnect = (peers.length !== this.bannedPeers.length);
		}
	// RandomPeer is not explicitly set, no peer discovery
	} else {
		reconnect = false;
	}

	return reconnect;
};

/**
 * @method checkOptions
 * @return options object
 */

LiskAPI.prototype.checkOptions = function (options) {
	Object.keys(options).forEach(function (optionKey) {
		if (options[optionKey] === undefined || options[optionKey] !== options[optionKey]) {
			throw { message: 'parameter value "'+optionKey+'" should not be '+ options[optionKey]  };
		}
	});

	return options;
};

function parseResponse (requestType, options, requestSuccess) {
	var parser = parseOfflineRequest(requestType, options);
	return parser.requestMethod === 'GET'
		? requestSuccess.body
		: parser.transactionOutputAfter(requestSuccess.body);
}

function handleTimestampIsInFutureFailures (requestType, options, result) {
	if (!result.success && result.message && result.message.match(/Timestamp is in the future/) && !(options.timeOffset > 40e3)) {
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
	if (this.checkReDial()) {
		return new Promise(function (resolve, reject) {
			setTimeout(function () {
				that.banNode();
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
	options = typeof options !== 'function' && typeof options !== 'undefined' ? this.checkOptions(options) : {};

	return this.sendRequestPromise(requestType, options)
		.then(parseResponse.bind(this, requestType, options))
		.then(handleTimestampIsInFutureFailures.bind(this, requestType, options))
		.catch(handleSendRequestFailures.bind(this, requestType, options))
		.then(optionallyCallCallback.bind(this, callback));
};

/**
 * @method sendRequestPromise
 * @param requestType
 * @param options
 *
 * @return APIcall Promise
 */

LiskAPI.prototype.sendRequestPromise = function (requestType, options) {
	if (this.checkRequest(requestType, options) !== 'NOACTION') {
		var requestValues = this.changeRequest(requestType, options);
		return this.doPopsicleRequest(requestValues);
	} else {
		return new Promise(function (resolve) {
			resolve({ done: 'done'});
		});
	}
};

/**
 * @method doPopsicleRequest
 * @param requestValue
 *
 * @return APIcall Promise
 */

LiskAPI.prototype.doPopsicleRequest = function (requestValue) {
	return popsicle.request({
		method: requestValue.requestMethod,
		url: requestValue.requestUrl,
		headers: requestValue.nethash,
		body: requestValue.requestMethod !== 'GET' ? requestValue.requestParams : ''
	}).use(popsicle.plugins.parse(['json', 'urlencoded']));
};

/**
 * @method doPopsicleRequest
 * @param requestType
 * @param options
 *
 * @return httpRequest object
 */

LiskAPI.prototype.changeRequest = function (requestType, options) {
	var returnValue = {
		requestMethod: '',
		requestUrl: '',
		nethash: '',
		requestParams: ''
	};

	var that = this;
	switch(this.checkRequest(requestType, options)) {
	case 'GET':
		returnValue.requestMethod = 'GET';
		returnValue.requestUrl = this.getFullUrl() + '/api/' + requestType;

		if (Object.keys(options).length > 0) {
			returnValue.requestUrl = returnValue.requestUrl + that.serialiseHttpData(options, returnValue.requestMethod);
		}

		returnValue.requestParams = options;
		break;
	case 'PUT':
	case 'POST':
		var transformRequest = parseOfflineRequest(requestType, options).checkOfflineRequestBefore();

		if (transformRequest.requestUrl === 'transactions' || transformRequest.requestUrl === 'signatures') {
			returnValue.requestUrl = that.getFullUrl()  + '/peer/'+ transformRequest.requestUrl;

			returnValue.nethash = that.nethash;
			returnValue.requestMethod = 'POST';
			returnValue.requestParams = transformRequest.params;
		} else {
			returnValue.requestUrl = that.getFullUrl()  + '/api/'+ transformRequest.requestUrl;
			returnValue.requestMethod = transformRequest.requestMethod;
			returnValue.requestParams = options;
		}
		break;
	default:
		break;
	}

	return returnValue;
};

/**
 * @method checkRequest
 * @param requestType
 * @param options
 *
 * @return method string
 */

LiskAPI.prototype.checkRequest = function (requestType, options) {
	return parseOfflineRequest(requestType, options).requestMethod;
};

/**
 * @method serialiseHttpData
 * @param data
 *
 * @return serialisedData string
 */

LiskAPI.prototype.serialiseHttpData = function (data) {
	var serialised;

	serialised = this.trimObj(data);
	serialised = this.toQueryString(serialised);
	serialised = encodeURI(serialised);

	return '?'+serialised;
};

/**
 * @method trimObj
 * @param obj
 *
 * @return trimmed string
 */

LiskAPI.prototype.trimObj = function (obj) {
	if (!Array.isArray(obj) && typeof obj !== 'object') return obj;

	return Object.keys(obj).reduce(function (acc, key) {
		acc[key.trim()] = (typeof obj[key] === 'string') ? obj[key].trim() : (Number.isInteger(obj[key])) ? obj[key].toString() : this.trimObj(obj[key]);
		return acc;
	}, Array.isArray(obj)? []:{});
};

/**
 * @method toQueryString
 * @param obj
 *
 * @return query string
 */

LiskAPI.prototype.toQueryString = function (obj) {
	var parts = [];

	for (var i in obj) {
		if (obj.hasOwnProperty(i)) {
			parts.push(encodeURIComponent(i) + '=' + encodeURI(obj[i]));
		}
	}

	return parts.join('&');
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

module.exports = LiskAPI;
