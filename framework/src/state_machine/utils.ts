/*
 * Copyright © 2022 Lisk Foundation
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

export const getContextStoreBool = (contextStore: Map<string, unknown>, key: string): boolean => {
	const val = contextStore.get(key);
	if (val === undefined) {
		return false;
	}
	if (typeof val !== 'boolean') {
		throw new Error('Invalid context value.');
	}
	return val;
};

export const getContextStoreBigInt = (contextStore: Map<string, unknown>, key: string): bigint => {
	const val = contextStore.get(key);
	if (val === undefined) {
		return BigInt(0);
	}
	if (typeof val !== 'bigint') {
		throw new Error('Invalid context value.');
	}
	return val;
};

export const getContextStoreNumber = (contextStore: Map<string, unknown>, key: string): number => {
	const val = contextStore.get(key);
	if (val === undefined) {
		return 0;
	}
	if (typeof val !== 'number') {
		throw new Error('Invalid context value.');
	}
	return val;
};

export const getContextStoreString = (contextStore: Map<string, unknown>, key: string): string => {
	const val = contextStore.get(key);
	if (val === undefined) {
		return '';
	}
	if (typeof val !== 'string') {
		throw new Error('Invalid context value.');
	}
	return val;
};
