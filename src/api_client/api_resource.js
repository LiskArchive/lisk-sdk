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

import axios from 'axios';

const API_RECONNECT_MAX_RETRY_COUNT = 3;

export default class APIResource {
	constructor(apiClient) {
		if (!apiClient) {
			throw new Error(
				'APIResource requires APIClient instance for initialization.',
			);
		}
		this.apiClient = apiClient;
		this.path = '';
	}

	get headers() {
		return this.apiClient.headers;
	}

	get resourcePath() {
		return `${this.apiClient.currentNode}/api${this.path}`;
	}

	request(req, retry, retryCount = 1) {
		const request = axios
			.request(req)
			.then(res => res.data)
			.catch(error => {
				if (error.response) {
					if (error.response.data && error.response.data.message) {
						throw new Error(
							`Status ${error.response.status} : ${
								error.response.data.message
							}`,
						);
					}
					throw new Error(
						`Status ${error.response.status} : An unknown error has occurred.`,
					);
				}
				throw error;
			});

		if (retry) {
			return request.catch(err => this.handleRetry(err, req, retryCount));
		}
		return request;
	}

	handleRetry(error, req, retryCount) {
		if (this.apiClient.hasAvailableNodes()) {
			return new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
				if (this.apiClient.randomizeNodes) {
					this.apiClient.banActiveNodeAndSelect();
				} else if (retryCount > API_RECONNECT_MAX_RETRY_COUNT) {
					throw error;
				}
				return this.request(req, true, retryCount + 1);
			});
		}
		return Promise.reject(error);
	}
}
