/*
 * Copyright © 2018 Lisk Foundation
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

export const toQueryString = (obj: object): string => {
	const parts = Object.entries(obj).reduce(
		(accumulator: ReadonlyArray<string>, [key, value]: [string, string]): ReadonlyArray<string> => [
			...accumulator,
			`${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
		],
		[],
	);
	
	return parts.join('&');
};

const urlParamRegex = /{[^}]+}/;
export const solveURLParams = (url: string, params: object = {}): string => {
	if (Object.keys(params).length === 0) {
		if (url.match(urlParamRegex) !== null) {
			throw new Error('URL is not completely solved');
		}

		return url;
	}
	const solvedURL = Object.entries(params).reduce(
		(accumulator: string, [key, value]: [string, string]): string => accumulator.replace(`{${key}}`, value),
		url,
	);

	if (solvedURL.match(urlParamRegex) !== null) {
		throw new Error('URL is not completely solved');
	}

	return encodeURI(solvedURL);
};
