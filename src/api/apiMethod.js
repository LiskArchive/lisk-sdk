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
import * as utils from './utils';

// Bind to resource class
const apiMethod = params => {
	const spec = params || {};
	const method = spec.method || GET;
	const path = spec.path || '';
	const urlParams = spec.urlParams || [];
	const validator = spec.validator || null;
	const defaultData = spec.defaultData || {};
	const retry = spec.retry || false;

	return function apiHandler(...args) {
		// this refers to resource class
		const self = this;
		let fullURL = self.resourcePath + path;
		const headers = self.headers;
		// if urlParams is set, replace variable within URL
		if (urlParams.length > 0) {
			if (args.length < urlParams.length) {
				return Promise.reject(Error('Arguments must include Params defined.'));
			}
			const urlData = {};
			urlParams.forEach(param => {
				urlData[param] = args.shift();
			});
			fullURL = utils.solveURLParams(fullURL, urlData);
		}
		// last argument is data
		// # same as length of urlParams is the arguments, and the last one is data(body or query)
		const data = Object.assign(
			{},
			defaultData,
			args.length > 0 && typeof args[0] === 'object' ? args[0] : {},
		);

		if (validator && data) {
			try {
				validator(data);
			} catch (err) {
				return Promise.reject(err);
			}
		}
		const requestData = {
			method,
			url: fullURL,
			headers,
		};
		if (Object.keys(data).length !== 0) {
			if (method === GET) {
				requestData.url += `?${utils.toQueryString(data)}`;
			} else {
				requestData.body = data;
			}
		}
		return self.request(requestData, retry);
	};
};

export default apiMethod;
