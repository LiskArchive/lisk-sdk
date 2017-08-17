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

module.exports = {
	trimObj,
	toQueryString,
};
