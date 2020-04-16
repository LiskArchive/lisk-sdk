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
import Axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import { APIClient } from './api_client';
import { APIErrorResponse, APIResponse, HashMap } from './api_types';
import { APIError } from './errors';

const API_RECONNECT_MAX_RETRY_COUNT = 3;

const REQUEST_RETRY_TIMEOUT = 1000;

export class APIResource {
	public readonly apiClient: APIClient;
	public path: string;

	public constructor(apiClient: Readonly<APIClient>) {
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
	): Promise<APIResponse> {
		if (this.apiClient.hasAvailableNodes()) {
			return new Promise<APIResponse>(resolve =>
				setTimeout(resolve, REQUEST_RETRY_TIMEOUT),
			).then(
				async (): Promise<APIResponse> => {
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

		throw error;
	}

	public async request(
		req: AxiosRequestConfig,
		retry: boolean,
		retryCount = 1,
	): Promise<APIResponse> {
		const request = Axios.request(req)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			.then((res: AxiosResponse) => res.data)
			.catch((error: AxiosError): void => {
				if (error.response) {
					const { status } = error.response;
					if (error.response.data) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const {
							error: errorString,
							errors,
							message,
						}: APIErrorResponse = error.response.data;
						throw new APIError(
							message ?? errorString ?? 'An unknown error has occurred.',
							status,
							errors,
						);
					}
					throw new APIError('An unknown error has occurred.', status);
				}
				throw error;
			});

		if (retry) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return request.catch(async (err: Error) =>
				this.handleRetry(err, req, retryCount),
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return request;
	}
}
