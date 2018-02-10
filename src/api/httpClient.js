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
import { GET, POST } from '../constants';

/**
 * @method toQueryString
 * @param obj
 *
 * @return {String}
 */
const toQueryString = obj => {
	const parts = Object.entries(obj).reduce(
		(accumulator, [key, value]) => [
			...accumulator,
			`${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
		],
		[],
	);

	return parts.join('&');
};

/**
 * @method createURL
 * @param baseURL
 * @param endpoint
 * @param query
 *
 * @return {String}
 */
const createURL = (baseURL, endpoint, query) => {
	let url = `${baseURL}/api/${endpoint}`;
	if (query) {
		url += `?${toQueryString(query)}`;
	}
	return url;
};

/**
 * @method get
 * @param baseURL
 * @param headers
 * @param endpoint
 * @param query?
 *
 * @return {Promise}
 */
export const get = (baseURL, headers, endpoint, query) =>
	popsicle
		.request({
			method: GET,
			url: createURL(baseURL, endpoint, query),
			headers,
		})
		.use(popsicle.plugins.parse(['json', 'urlencoded']));

/**
 * @method post
 * @param baseURL
 * @param headers
 * @param endpoint
 * @param body
 *
 * @return {Promise}
 */
export const post = (baseURL, headers, endpoint, body) =>
	popsicle
		.request({
			method: POST,
			url: createURL(baseURL, endpoint),
			headers,
			body,
		})
		.use(popsicle.plugins.parse(['json', 'urlencoded']));
