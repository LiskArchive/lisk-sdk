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
 * @method optionallyCallCallback
 * @param callback
 * @param result
 *
 * @return result object
 */

function optionallyCallCallback(callback, result) {
	if (typeof callback === 'function') {
		callback(result);
	}
	return result;
}

/**
 * @method constructRequestData
 * @param providedObject
 * @param optionsOrCallback
 *
 * @return request object
 */

const constructRequestData = (providedObject, optionsOrCallback) => {
	const providedOptions = typeof optionsOrCallback !== 'function' && typeof optionsOrCallback !== 'undefined' ? optionsOrCallback : {};
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

const wrapSendRequest = (method, endpoint, getDataFn) =>
	function wrappedSendRequest(value, optionsOrCallback, callbackIfOptions) {
		const callback = callbackIfOptions || optionsOrCallback;
		const data = constructRequestData(getDataFn(value, optionsOrCallback), optionsOrCallback);
		return this.sendRequest(method, endpoint, data, callback);
	};

/**
 * @method checkOptions
 * @private
 * @return options object
 */

const checkOptions = (options) => {
	Object.entries(options)
		.forEach(([key, value]) => {
			if (value === undefined || Number.isNaN(value)) {
				throw new Error(`"${key}" option should not be ${value}`);
			}
		});

	return options;
};

/**
 * @method trimObj
 * @param obj
 *
 * @return trimmed object
 */
function trimObj(obj) {
	const isArray = Array.isArray(obj);
	if (!isArray && typeof obj !== 'object') {
		return Number.isInteger(obj)
			? obj.toString()
			: obj;
	}

	const trim = value => (
		typeof value === 'string'
			? value.trim()
			: trimObj(value)
	);

	return isArray
		? obj.map(trim)
		: Object.entries(obj)
			.reduce((accumulator, [key, value]) => {
				const trimmedKey = trim(key);
				const trimmedValue = trim(value);
				return Object.assign({}, accumulator, {
					[trimmedKey]: trimmedValue,
				});
			}, {});
}

/**
 * @method toQueryString
 * @param obj
 *
 * @return query string
 */
function toQueryString(obj) {
	const parts = Object.entries(obj)
		.reduce((accumulator, [key, value]) => [
			...accumulator,
			`${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
		], []);

	return parts.join('&');
}

/**
 * @method serialiseHTTPData
 * @param data
 *
 * @return serialisedData string
 */

const serialiseHTTPData = (data) => {
	const trimmed = trimObj(data);
	const queryString = toQueryString(trimmed);
	return `?${queryString}`;
};

module.exports = {
	trimObj,
	toQueryString,
	serialiseHTTPData,
	checkOptions,
	constructRequestData,
	wrapSendRequest,
	optionallyCallCallback,
};
