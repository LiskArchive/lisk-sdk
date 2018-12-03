import { APIClient } from '@liskhq/lisk-api-client';

/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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

interface APIResponse {
	readonly data?: unknown;
}

const isArray = <T>(val: T | ReadonlyArray<T>): val is ReadonlyArray<T> =>
	Array.isArray(val);

export const handleResponse = (
	endpoint: string,
	res: APIResponse,
	placeholder?: object,
): unknown => {
	// Get endpoints with 2xx status code should always return with data key.
	if (!res.data) {
		throw new Error('No data was returned.');
	}
	if (isArray(res.data)) {
		if (res.data.length === 0) {
			if (placeholder) {
				return placeholder;
			}
			throw new Error(`No ${endpoint} found using specified parameters.`);
		}
		if (res.data.length > 1) {
			return res.data;
		}

		return res.data[0];
	}

	return res.data;
};

interface QueryParameter {
	readonly placeholder?: object;
	readonly query: object;
}

type EndpointTypes =
	| 'accounts'
	| 'blocks'
	| 'dapps'
	| 'delegates'
	| 'peers'
	| 'transactions'
	| 'voters'
	| 'votes';

export const query = async (
	client: APIClient,
	endpoint: EndpointTypes,
	parameters: QueryParameter | ReadonlyArray<QueryParameter>,
): Promise<unknown> =>
	isArray(parameters)
		? Promise.all(
				parameters.map((param: QueryParameter) =>
					client[endpoint]
						.get(param.query)
						.then((res: APIResponse) =>
							handleResponse(endpoint, res, param.placeholder),
						),
				),
			)
		: client[endpoint]
				.get(parameters.query)
				.then((res: APIResponse) =>
					handleResponse(endpoint, res, parameters.placeholder),
				);

export const queryNodeTransaction =
	async (client: APIClient, txnState: string, parameters: QueryParameter | ReadonlyArray<QueryParameter>): Promise<unknown> =>
		Promise.all(
			parameters.map(param =>
				client
					.getTransactions(txnState, param.query)
					.then(res =>
						handleResponse('node/transactions', res, param.placeholder),
					),
			),
		);
