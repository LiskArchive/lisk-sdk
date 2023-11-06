/*
 * Copyright © 2021 Lisk Foundation
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
 */

import { EndpointHandler, EndpointHandlers } from './types';

const reservedEndpointName = ['constructor', 'init', 'addDependencies'];

export const isReservedEndpointFunction = (key: string): boolean =>
	key.startsWith('_') || reservedEndpointName.includes(key);

export const getEndpointHandlers = (endpoint: Record<string, unknown>): EndpointHandlers => {
	const endpointHandlers: EndpointHandlers = new Map();
	let isBaseEndpoint;
	let localEndpoint = endpoint;

	// For endpoints which extend other endpoints, go deeper in the prototype chain
	do {
		for (const key of Object.getOwnPropertyNames(localEndpoint)) {
			const val = localEndpoint[key];
			if (!isReservedEndpointFunction(key) && typeof val === 'function') {
				endpointHandlers.set(key, val.bind(endpoint) as EndpointHandler);
			}
		}

		localEndpoint = Object.getPrototypeOf(localEndpoint) as Record<string, unknown>;

		isBaseEndpoint = localEndpoint.constructor.name === Object.name;
	} while (!isBaseEndpoint);

	return endpointHandlers;
};

export const mergeEndpointHandlers = (...handlers: EndpointHandlers[]): EndpointHandlers =>
	handlers.reduce<EndpointHandlers>((prev, curr) => new Map([...prev, ...curr]), new Map());

export const getEndpointPath = (namespace: string, method: string) => `${namespace}_${method}`;
