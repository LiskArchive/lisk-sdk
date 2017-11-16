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
  * @method netHashOptions
  * @return {Object}
  * @private
  */

export const netHashOptions = ({ port }) => {
	const testnetNethash =
		'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const mainnetNethash =
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';

	const commonNethash = {
		'Content-Type': 'application/json',
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port,
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
};

/**
  * @method getURLPrefix
  * @return {String}
  * @private
  */

export const getURLPrefix = ({ ssl }) => (ssl ? 'https' : 'http');

/**
  * @method getFullURL
  * @return {String}
  * @private
  */

export const getFullURL = ({ node, port, ssl }) => {
	const nodeUrl = port ? `${node}:${port}` : node;
	return `${getURLPrefix({ ssl })}://${nodeUrl}`;
};

/**
 * @method optionallyCallCallback
 * @param callback
 * @param result
 *
 * @return result object
 */

export const optionallyCallCallback = (callback, result) => {
	if (typeof callback === 'function') {
		callback(result);
	}
	return result;
};

/**
 * @method constructRequestData
 * @param providedObject
 * @param optionsOrCallback
 *
 * @return request object
 */

export const constructRequestData = (providedObject, optionsOrCallback) => {
	const providedOptions =
		typeof optionsOrCallback !== 'function' &&
		typeof optionsOrCallback !== 'undefined'
			? optionsOrCallback
			: {};
	return Object.assign({}, providedOptions, providedObject);
};

/**
 * @method wrapSendRequest
 * @param method
 * @param endpoint
 * @param getDataFn
 *
 * @return function wrappedSendRequest
 */

export const wrapSendRequest = (method, endpoint, getDataFn) =>
	function wrappedSendRequest(value, optionsOrCallback, callbackIfOptions) {
		const callback = callbackIfOptions || optionsOrCallback;
		const data = constructRequestData(
			getDataFn(value, optionsOrCallback),
			optionsOrCallback,
		);
		return this.sendRequest(method, endpoint, data, callback);
	};

/**
 * @method checkOptions
 * @private
 * @return options object
 */

export const checkOptions = options => {
	Object.entries(options).forEach(([key, value]) => {
		if (value === undefined || Number.isNaN(value)) {
			throw new Error(`"${key}" option should not be ${value}`);
		}
	});

	return options;
};

/**
 * @method toQueryString
 * @param obj
 *
 * @return query string
 */
export const toQueryString = obj => {
	const parts = Object.entries(obj).reduce(
		(accumulator, [key, value]) => [
			...accumulator,
			`${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
		],
		[],
	);

	return parts.join('&');
};
