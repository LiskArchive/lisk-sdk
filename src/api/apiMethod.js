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

import { GET } from 'constants';
import { solveURLParams, toQueryString } from './utils';

// Bind to resource class
const apiMethod = (params = {}) => {
	const {
		method = GET,
		path = '',
		urlParams = [],
		validator = null,
		defaultData = {},
		retry = false,
	} = params;

	return function apiHandler(...args) {
		if (urlParams.length > 0 && args.length < urlParams.length) {
			return Promise.reject(
				new Error(
					`This endpoint must be supplied with the following parameters:${urlParams.toString()}`,
				),
			);
		}

		const data = Object.assign(
			{},
			defaultData,
			args.length > urlParams.length &&
			typeof args[urlParams.length] === 'object'
				? args[urlParams.length]
				: {},
		);

		if (validator) {
			try {
				validator(data);
			} catch (err) {
				return Promise.reject(err);
			}
		}

		const urlData = urlParams.reduce(
			(accumulator, param, i) =>
				Object.assign({}, accumulator, { [param]: args[i] }),
			{},
		);

		const requestData = {
			method,
			url: solveURLParams(`${this.resourcePath}${path}`, urlData),
			headers: this.headers,
		};

		if (Object.keys(data).length > 0) {
			if (method === GET) {
				requestData.url += `?${toQueryString(data)}`;
			} else {
				requestData.body = data;
			}
		}
		return this.request(requestData, retry);
	};
};

export default apiMethod;
