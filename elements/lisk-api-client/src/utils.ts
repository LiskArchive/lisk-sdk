/*
 * Copyright © 2019 Lisk Foundation
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
import { HashMap } from './api_types';

export const toQueryString = (obj: HashMap): string => {
	const parts = Object.keys(obj).reduce(
		(
			accumulator: ReadonlyArray<string>,
			key: string,
		): ReadonlyArray<string> => [
			...accumulator,
			`${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`,
		],
		[],
	);

	return parts.join('&');
};

const urlParamRegex = /{[^}]+}/;
export const solveURLParams = (url: string, params: HashMap = {}): string => {
	if (Object.keys(params).length === 0) {
		if (url.match(urlParamRegex) !== null) {
			throw new Error('URL is not completely solved');
		}

		return url;
	}
	const solvedURL = Object.keys(params).reduce(
		(accumulator: string, key: string): string =>
			accumulator.replace(`{${key}}`, params[key]),
		url,
	);

	if (solvedURL.match(urlParamRegex) !== null) {
		throw new Error('URL is not completely solved');
	}

	return encodeURI(solvedURL);
};
