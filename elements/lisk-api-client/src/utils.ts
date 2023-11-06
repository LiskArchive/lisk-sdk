/*
 * Copyright © 2020 Lisk Foundation
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

import { JSONRPCError, JSONRPCMessage, JSONRPCNotification } from './types';

export const convertRPCError = (error: JSONRPCError): Error =>
	new Error(typeof error.data === 'string' ? error.data : error.message);

export const promiseWithTimeout = async <T = void>(
	promises: Promise<T>[],
	ms: number,
	message?: string,
): Promise<T> => {
	let timeout: NodeJS.Timeout | undefined;
	try {
		const result = await Promise.race([
			...promises,
			new Promise((_, reject) => {
				timeout = setTimeout(() => {
					reject(new Error(message ?? `Timed out in ${ms}ms.`));
				}, ms);
			}),
		]);
		return result as T;
	} finally {
		if (timeout) {
			clearTimeout(timeout);
		}
	}
};

interface Defer<T> {
	promise: Promise<T>;
	resolve: (result: T) => void;
	reject: (error?: Error) => void;
}

export const defer = <T>(): Defer<T> => {
	let resolve!: (res: T) => void;
	let reject!: (error?: Error) => void;

	const promise = new Promise<T>((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});

	return { promise, resolve, reject };
};

export const messageIsNotification = <T = unknown>(
	input: JSONRPCMessage<T>,
): input is JSONRPCNotification<T> =>
	!!((input.id === undefined || input.id === null) && input.method);
