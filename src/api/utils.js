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

const urlParamRegex = /{[^}]+}/;
export const solveURLParams = (url, params = {}) => {
	if (Object.keys(params).length === 0) {
		if (url.match(urlParamRegex)) {
			throw new Error('URL is not completely solved');
		}
		return url;
	}
	const solvedURL = Object.keys(params).reduce(
		(accumulator, key) => accumulator.replace(`{${key}}`, params[key]),
		url,
	);

	if (solvedURL.match(urlParamRegex)) {
		throw new Error('URL is not completely solved');
	}

	return encodeURI(solvedURL);
};
