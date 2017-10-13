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
import * as utils from './utils';

const GET = 'GET';

/**
 * @method netHashOptions
 * @return {Object}
 * @private
 */

export function netHashOptions() {
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
 * @return {String}
 * @private
 */

export function getURLPrefix() {
	return this.ssl
		? 'https'
		: 'http';
}

/**
 * @method getFullURL
 * @return {String}
 * @private
 */

export function getFullURL() {
	const nodeUrl = this.port
		? `${this.node}:${this.port}`
		: this.node;

	return `${getURLPrefix.call(this)}://${nodeUrl}`;
}

/**
 * @method getNodes
 * @return {Array}
 * @private
 */

export function getNodes() {
	if (this.testnet) return this.defaultTestnetNodes;
	if (this.ssl) return this.defaultSSLNodes;
	return this.defaultNodes;
}

/**
 * @method isBanned
 * @return {Boolean}
 * @private
 */


export function isBanned(node) {
	return this.bannedNodes.includes(node);
}

/**
 * @method getRandomNode
 * @return  {String}
 * @private
 */

export function getRandomNode() {
	const nodes = getNodes.call(this)
		.filter(node => !isBanned.call(this, node));

	if (!nodes.length) {
		throw new Error('Cannot get random node: all relevant nodes have been banned.');
	}

	const randomIndex = Math.floor((Math.random() * nodes.length));
	return nodes[randomIndex];
}

/**
 * @method selectNewNode
 * @return {String}
 * @private
 */

export function selectNewNode() {
	const providedNode = this.options.node;

	if (this.randomNode) {
		return getRandomNode.call(this);
	} else if (providedNode) {
		if (isBanned.call(this, providedNode)) {
			throw new Error('Cannot select node: provided node has been banned and randomNode is not set to true.');
		}
		return providedNode;
	}

	throw new Error('Cannot select node: no node provided and randomNode is not set to true.');
}

/**
 * @method banActiveNode
 * @private
 */

export function banActiveNode() {
	if (!isBanned.call(this, this.node)) {
		this.bannedNodes.push(this.node);
	}
}

/**
 * @method hasAvailableNodes
 * @return {Boolean}
 * @private
 */

export function hasAvailableNodes() {
	const nodes = getNodes.call(this);

	return this.randomNode
		? nodes.some(node => !isBanned.call(this, node))
		: false;
}

/**
 * @method createRequestObject
 * @param method
 * @param requestType
 * @param providedOptions
 * @private
 *
 * @return {Object}
 */

export function createRequestObject(method, requestType, providedOptions) {
	const options = providedOptions || {};
	const url = method === GET
		? `${getFullURL.call(this)}/api/${requestType}${utils.serialiseHTTPData.call(this, options)}`
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
 * @return {Promise}
 */

export function sendRequestPromise(requestMethod, requestType, options) {
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
 *
 * @return {Promise}
 */

export function handleTimestampIsInFutureFailures(requestMethod, requestType, options, result) {
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
 *
 * @return {Promise}
 */

export function handleSendRequestFailures(requestMethod, requestType, options, error) {
	const that = this;
	if (hasAvailableNodes.call(that)) {
		return new Promise(((resolve, reject) => {
			setTimeout(() => {
				if (that.randomNode) {
					banActiveNode.call(that);
				}
				that.setNode();
				that.sendRequest(requestMethod, requestType, options)
					.then(resolve, reject);
			}, 1000);
		}));
	}
	return Promise.resolve({
		success: false,
		error,
		message: 'Could not create an HTTP request to any known nodes.',
	});
}
