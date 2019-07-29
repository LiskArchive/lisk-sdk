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
import { AxiosRequestConfig } from 'axios';
import {
	APIHandler,
	APIResponse,
	HashMap,
	RequestConfig,
	Resource,
} from './api_types';
import { GET } from './constants';
import { solveURLParams, toQueryString } from './utils';

// Bind to resource class
export const apiMethod = (options: RequestConfig = {}): APIHandler =>
	async function apiHandler(
		this: Resource,
		// tslint:disable-next-line readonly-array
		...args: Array<number | string | object>
	): Promise<APIResponse> {
		const {
			method = GET,
			path = '',
			urlParams = [],
			validator,
			defaultData = {},
			retry = false,
		} = options;

		if (urlParams.length > 0 && args.length < urlParams.length) {
			return Promise.reject(
				new Error(
					`This endpoint must be supplied with the following parameters: ${urlParams.toString()}`,
				),
			);
		}

		const data = {
			...defaultData,
			...(args.length > urlParams.length &&
			typeof args[urlParams.length] === 'object'
				? (args[urlParams.length] as object)
				: {}),
		};

		if (validator) {
			try {
				validator(data);
			} catch (err) {
				return Promise.reject(err);
			}
		}

		const resolvedURLObject = urlParams.reduce(
			// tslint:disable-next-line no-inferred-empty-object-type
			(accumulator: HashMap, param: string, i: number): HashMap => {
				const value = args[i];
				if (typeof value !== 'string' && typeof value !== 'number') {
					throw new Error('Parameter must be a string or a number');
				}

				return {
					...accumulator,
					[param]: typeof value === 'number' ? value.toString() : value,
				};
			},
			{},
		);

		const requestData: AxiosRequestConfig = {
			headers: this.headers,
			method,
			url: solveURLParams(`${this.resourcePath}${path}`, resolvedURLObject),
		};

		if (Object.keys(data).length > 0) {
			if (method === GET) {
				requestData.url += `?${toQueryString(data)}`;
			} else {
				requestData.data = data;
			}
		}

		return this.request(requestData, retry);
	};
