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
import * as popsicle from 'popsicle';
import utils from './utils';

const GET = 'GET';

/**
 * @method netHashOptions
 * @return {object}
 * @private
 */

function netHashOptions() {
	const testnetNethash = 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const mainnetNethash = 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';

	const commonNethash = {
		'Content-Type': 'application/json',
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: this.port,
	};

	return {
		testnet: Object.assign({}, commonNethash, {
			nethash: testnetNethash,
			broadhash: testnetNethash,
		}),
		mainnet: Object.assign({}, commonNethash, {
			nethash: mainnetNethash,
			broadhash: mainnetNethash,
		}),
	};
}

/**
 * @method getURLPrefix
 * @return prefix string
 * @private
 */

function getURLPrefix() {
	return this.ssl
		? 'https'
		: 'http';
}

/**
 * @method getFullURL
 * @return url string
 * @private
 */

function getFullURL() {
	const nodeUrl = this.port
		? `${this.currentPeer}:${this.port}`
		: this.currentPeer;

	return `${getURLPrefix.call(this)}://${nodeUrl}`;
}

/**
 * @method getPeers
 * @return peers Array
 * @private
 */

function getPeers() {
	if (this.testnet) return this.defaultTestnetPeers;
	if (this.ssl) return this.defaultSSLPeers;
	return this.defaultPeers;
}

/**
 * @method getRandomPeer
 * @return peer string
 * @private
 */

function getRandomPeer() {
	const peers = getPeers.call(this)
		.filter(peer => !this.bannedPeers.includes(peer));

	if (!peers.length) {
		throw new Error('Cannot get random peer: all relevant peers have been banned.');
	}

	const randomIndex = Math.floor((Math.random() * peers.length));
	return peers[randomIndex];
}

/**
 * @method selectNode
 * @return peer string
 * @private
 */

function selectNode() {
	const providedNode = this.options.node;

	if (this.randomPeer) {
		return getRandomPeer.call(this);
	} else if (providedNode) {
		if (this.bannedPeers.includes(providedNode)) {
			throw new Error('Cannot select node: provided node has been banned and randomPeer is not set to true.');
		}
		return providedNode;
	}

	throw new Error('Cannot select node: no node provided and randomPeer is not set to true.');
}

/**
 * @method banNode
 * @private
 */

function banNode() {
	if (!this.bannedPeers.includes(this.currentPeer)) {
		this.bannedPeers.push(this.currentPeer);
	}
}

/**
 * @method checkReDial
 * @return reDial boolean
 * @private
 */

function checkReDial() {
	const peers = getPeers.call(this);

	// RandomPeer discovery explicitly set
	if (this.randomPeer === true) {
		// A nethash has been set by the user. This influences internal redirection
		if (this.options.nethash) {
			// Nethash is equal to testnet nethash, we can proceed to get testnet peers
			if (this.options.nethash === netHashOptions.call(this).testnet.nethash) {
				this.setTestnet(true);
				return true;
			// Nethash is equal to mainnet nethash, we can proceed to get mainnet peers
			} else if (this.options.nethash === netHashOptions.call(this).mainnet.nethash) {
				this.setTestnet(false);
				return true;
			}
			// Nethash is neither mainnet nor testnet, do not proceed to get peers
			return false;
		}
		// No nethash set, we can take the usual approach:
		// take a random peer if there is any that is not banned
		return peers.some(peer => !this.bannedPeers.includes(peer));
	}
	// RandomPeer is not explicitly set, no peer discovery
	return false;
}

/**
 * @method createRequestObject
 * @param method
 * @param requestType
 * @param providedOptions
 * @private
 *
 * @return request Object
 */

function createRequestObject(method, requestType, providedOptions) {
	const options = providedOptions || {};
	const url = method === GET
		? `${getFullURL.call(this)}/api/${requestType}${serialiseHTTPData.call(this, options)}`
		: `${getFullURL.call(this)}/api/${requestType}`;

	return {
		method,
		url,
		headers: this.nethash,
		body: method === GET ? {} : options,
	};
}

/**
 * @method sendRequestPromise
 * @param requestMethod
 * @param requestType
 * @param options
 * @private
 *
 * @return APIcall Promise
 */

function sendRequestPromise(requestMethod, requestType, options) {
	const requestObject = createRequestObject.call(this, requestMethod, requestType, options);

	return popsicle
		.request(requestObject)
		.use(popsicle.plugins.parse(['json', 'urlencoded']));
}

/**
 * @method handleTimestampIsInFutureFailures
 * @param requestMethod
 * @param requestType
 * @param options
 * @param result
 * @private
 */

function handleTimestampIsInFutureFailures(requestMethod, requestType, options, result) {
	if (!result.success && result.message && result.message.match(/Timestamp is in the future/) && !(options.timeOffset > 40)) {
		const newOptions = Object.assign({}, options, {
			timeOffset: (options.timeOffset || 0) + 10,
		});

		return this.sendRequest(requestMethod, requestType, newOptions);
	}
	return Promise.resolve(result);
}

/**
 * @method handleSendRequestFailures
 * @param requestMethod
 * @param requestType
 * @param options
 * @param result
 * @private 
 */

function handleSendRequestFailures(requestMethod, requestType, options, error) {
	const that = this;
	if (checkReDial.call(that)) {
		return new Promise(((resolve, reject) => {
			setTimeout(() => {
				banNode.call(that);
				that.setNode();
				that.sendRequest(requestMethod, requestType, options)
					.then(resolve, reject);
			}, 1000);
		}));
	}
	return Promise.resolve({
		success: false,
		error,
		message: 'Could not create an HTTP request to any known peers.',
	});
}


module.exports = {
	netHashOptions,
	getFullURL,
	getURLPrefix,
	selectNode,
	getPeers,
	getRandomPeer,
	banNode,
	checkReDial,
	checkOptions,
	sendRequestPromise,
	serialiseHTTPData,
	createRequestObject,
	constructRequestData,
	wrapSendRequest,
	handleTimestampIsInFutureFailures,
	handleSendRequestFailures,
	optionallyCallCallback,
};
