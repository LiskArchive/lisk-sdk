const utils = require('./utils');
const popsicle = require('popsicle');

/**
 * @method netHashOptions
 * @return {object}
 * @private
 */

function netHashOptions() {
	return {
		testnet: {
			'Content-Type': 'application/json',
			nethash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			broadhash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			os: 'lisk-js-api',
			version: '1.0.0',
			minVersion: '>=0.5.0',
			port: this.port,
		},
		mainnet: {
			'Content-Type': 'application/json',
			nethash: 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			broadhash: 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			os: 'lisk-js-api',
			version: '1.0.0',
			minVersion: '>=0.5.0',
			port: this.port,
		},
	};
}

/**
 * @method getURLPrefix
 * @return prefix string
 * @private
 */

function getURLPrefix() {
	if (this.ssl) {
		return 'https';
	}
	return 'http';
}

/**
 * @method getFullUrl
 * @return url string
 * @private
 */

function getFullUrl() {
	let nodeUrl = this.currentPeer;

	if (this.port) {
		nodeUrl += `:${this.port}`;
	}

	return `${getURLPrefix.call(this)}://${nodeUrl}`;
}

/**
 * @method getRandomPeer
 * @return peer string
 * @private
 */

function getRandomPeer() {
	let peers = (this.ssl) ? this.defaultSSLPeers : this.defaultPeers;
	if (this.testnet) peers = this.defaultTestnetPeers;

	const getRandomNumberForPeer = Math.floor((Math.random() * peers.length));
	return peers[getRandomNumberForPeer];
}

/**
 * @method selectNode
 * @return peer string
 * @private
 */

function selectNode() {
	let currentRandomPeer;

	if (this.options.node) {
		currentRandomPeer = this.currentPeer;
	}

	if (this.randomPeer) {
		currentRandomPeer = getRandomPeer.call(this);
		let peers = (this.ssl) ? this.defaultSSLPeers : this.defaultPeers;
		if (this.testnet) peers = this.defaultTestnetPeers;

		for (let x = 0; x < peers.length; x++) {
			if (this.bannedPeers.indexOf(currentRandomPeer) === -1) break;
			currentRandomPeer = getRandomPeer.call(this);
		}
	}

	return currentRandomPeer;
}

/**
 * @method banNode
 * @private
 */

function banNode() {
	if (this.bannedPeers.indexOf(this.currentPeer) === -1) this.bannedPeers.push(this.currentPeer);
	selectNode.call(this);
}

/**
 * @method checkReDial
 * @return reDial boolean
 * @private
 */

function checkReDial() {
	let peers = (this.ssl) ? this.defaultSSLPeers : this.defaultPeers;
	if (this.testnet) peers = this.defaultTestnetPeers;

	let reconnect = true;

	// RandomPeer discovery explicitly set
	if (this.randomPeer === true) {
		// A nethash has been set by the user. This influences internal redirection
		if (this.options.nethash) {
			// Nethash is equal to testnet nethash, we can proceed to get testnet peers
			if (this.options.nethash === netHashOptions.call(this).testnet.nethash) {
				this.setTestnet(true);
				reconnect = true;
			// Nethash is equal to mainnet nethash, we can proceed to get mainnet peers
			} else if (this.options.nethash === netHashOptions.call(this).mainnet.nethash) {
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
}

/**
 * @method checkOptions
 * @return options object
 * @private
 */

function checkOptions(options) {
	Object.keys(options).forEach((optionKey) => {
		if (options[optionKey] === undefined || options[optionKey] !== options[optionKey]) {
			throw { message: `parameter value "${optionKey}" should not be ${options[optionKey]}` };
		}
	});

	return options;
}

/**
 * @method serialiseHttpData
 * @param data
 *
 * @return serialisedData string
 */

function serialiseHttpData(data) {
	let serialised;

	serialised = utils.trimObj(data);
	serialised = utils.toQueryString(serialised);
	serialised = encodeURI(serialised);

	return `?${serialised}`;
}

/**
 * @method checkRequest
 * @param requestType
 * @param options
 * @private
 *
 * @return method string
 */

function checkRequest(requestType, options) {
	return this.parseOfflineRequests(requestType, options).requestMethod;
}


/**
 * @method changeRequest
 * @param requestType
 * @param options
 * @private
 *
 * @return httpRequest object
 */

function changeRequest(requestType, options) {
	const returnValue = {
		requestMethod: '',
		requestUrl: '',
		nethash: '',
		requestParams: '',
	};

	const that = this;
	switch (checkRequest.call(this, requestType, options)) {
	case 'GET':
		returnValue.requestMethod = 'GET';
		returnValue.requestUrl = `${getFullUrl.call(this)}/api/${requestType}`;

		if (Object.keys(options).length > 0) {
			returnValue.requestUrl += serialiseHttpData.call(that, options, returnValue.requestMethod);
		}

		returnValue.requestParams = options;
		break;
	case 'PUT':
	case 'POST':
		var transformRequest = this.parseOfflineRequests(requestType, options).checkOfflineRequestBefore();

		if (transformRequest.requestUrl === 'transactions' || transformRequest.requestUrl === 'signatures') {
			returnValue.requestUrl = `${getFullUrl.call(this)}/peer/${transformRequest.requestUrl}`;

			returnValue.nethash = that.nethash;
			returnValue.requestMethod = 'POST';
			returnValue.requestParams = transformRequest.params;
		} else {
			returnValue.requestUrl = `${getFullUrl.call(this)}/api/${transformRequest.requestUrl}`;
			returnValue.requestMethod = transformRequest.requestMethod;
			returnValue.requestParams = options;
		}
		break;
	default:
		break;
	}

	return returnValue;
}

/**
 * @method doPopsicleRequest
 * @param requestValue
 * @private
 *
 * @return APIcall Promise
 */

function doPopsicleRequest(requestValue) {
	return popsicle.request({
		method: requestValue.requestMethod,
		url: requestValue.requestUrl,
		headers: requestValue.nethash,
		body: requestValue.requestMethod !== 'GET' ? requestValue.requestParams : '',
	}).use(popsicle.plugins.parse(['json', 'urlencoded']));
}

/**
 * @method sendRequestPromise
 * @param requestType
 * @param options
 * @private
 *
 * @return APIcall Promise
 */

function sendRequestPromise(requestType, options) {
	if (checkRequest.call(this, requestType, options) !== 'NOACTION') {
		const requestValues = changeRequest.call(this, requestType, options);
		return doPopsicleRequest.call(this, requestValues);
	}
	return new Promise(((resolve) => {
		resolve({ done: 'done' });
	}));
}

module.exports = {
	netHashOptions,
	getFullUrl,
	getURLPrefix,
	selectNode,
	getRandomPeer,
	banNode,
	checkReDial,
	checkOptions,
	sendRequestPromise,
	doPopsicleRequest,
	changeRequest,
	checkRequest,
	serialiseHttpData,
};
