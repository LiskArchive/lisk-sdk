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
 */

import { BufferSet } from '../data_structures/buffer_set';

export const bufferArrayIncludes = (arr: Buffer[], val: Buffer): boolean =>
	arr.find(a => a.equals(val)) !== undefined;

export const bufferArrayContains = (arr1: Buffer[], arr2: Buffer[]): boolean =>
	arr2.every(val => bufferArrayIncludes(arr1, val));

export const bufferArrayContainsSome = (arr1: Buffer[], arr2: Buffer[]): boolean =>
	arr2.some(val => bufferArrayIncludes(arr1, val));

export const bufferArrayEqual = (arr1: Buffer[], arr2: Buffer[]): boolean =>
	arr1.length === arr2.length && arr1.every((val, index) => val.equals(arr2[index]));

export const bufferArraySubtract = (arr1: Buffer[], arr2: Buffer[]): Buffer[] =>
	arr1.filter(a => !bufferArrayIncludes(arr2, a));

export const isBufferArrayOrdered = (arr1: Buffer[]): boolean => {
	const sortedArray = [...arr1];
	sortedArray.sort((a, b) => a.compare(b));

	return bufferArrayEqual(arr1, sortedArray);
};

export const bufferArrayUniqueItems = (arr1: Buffer[]): boolean =>
	arr1.length === new BufferSet([...arr1]).size;
