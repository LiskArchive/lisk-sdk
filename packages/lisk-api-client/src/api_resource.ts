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
import Axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIClient } from './api_client';
import { ApiResponse, HashMap } from './api_types';

const API_RECONNECT_MAX_RETRY_COUNT = 3;

const REQUEST_RETRY_TIMEOUT = 1000;

export class APIResource {
	public apiClient: APIClient;
	public path: string;

	public constructor(apiClient: APIClient) {
		this.apiClient = apiClient;
		this.path = '';
	}

	public get headers(): HashMap {
		return this.apiClient.headers;
	}

	public get resourcePath(): string {
		return `${this.apiClient.currentNode}/api${this.path}`;
	}

	public async handleRetry(
		error: Error,
		req: AxiosRequestConfig,
		retryCount: number,
	): Promise<ApiResponse | Error> {
		if (this.apiClient.hasAvailableNodes()) {
			return new Promise<ApiResponse | Error>(resolve =>
				setTimeout(resolve, REQUEST_RETRY_TIMEOUT),
			).then(
				async (): Promise<ApiResponse | Error> => {
					if (retryCount > API_RECONNECT_MAX_RETRY_COUNT) {
						throw error;
					}
					if (this.apiClient.randomizeNodes) {
						this.apiClient.banActiveNodeAndSelect();
					}

					return this.request(req, true, retryCount + 1);
				},
			);
		}

		return Promise.reject(error);
	}

	public async request(
		req: AxiosRequestConfig,
		retry: boolean,
		retryCount: number = 1,
	): Promise<ApiResponse | Error> {
		const request = Axios.request(req)
			.then((res: AxiosResponse) => res.data)
			.catch(
				(error: AxiosError): Error => {
					if (error.response) {
						if (error.response.data && error.response.data.message) {
							throw new Error(
								`Status ${error.response.status} : ${
									error.response.data.message
								}`,
							);
						}
						throw new Error(
							`Status ${
								error.response.status
							} : An unknown error has occurred.`,
						);
					}
					throw error;
				},
			);

		if (retry) {
			return request.catch(async (err: Error) =>
				this.handleRetry(err, req, retryCount),
			);
		}

		return request;
	}
}
