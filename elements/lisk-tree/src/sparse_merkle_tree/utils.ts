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

import { hash } from '@liskhq/lisk-cryptography';
import { objects } from '@liskhq/lisk-utils';
import { EMPTY_HASH, LEAF_HASH_PREFIX } from './constants';
import { Query } from './types';

export const isLeaf = (value: Buffer): boolean => value[0] === LEAF_HASH_PREFIX[0];

type CalculateRootQueryObjects = Omit<Query, 'bitmap'> & { hash: Buffer; binaryBitmap: string };

// Sort queries by the longest binaryBitmap, breaking ties by smaller key.
// https://github.com/LiskHQ/lips-staging/blob/master/proposals/lip-0039.md#proof-construction
export const sortByBitmapAndKey = <T extends { key: Buffer; binaryBitmap: string }>(
	queries: T[],
): T[] =>
	queries.sort((q1, q2) => {
		if (q1.binaryBitmap.length === q2.binaryBitmap.length) {
			if (q1.key.byteLength === q2.key.byteLength) {
				return Buffer.compare(q1.key, q2.key);
			}

			return q1.key.byteLength - q2.key.byteLength;
		}

		return q2.binaryBitmap.length - q1.binaryBitmap.length;
	});

// Remove queries that have merged together, keep only those with a different key prefix
// https://github.com/LiskHQ/lips-staging/blob/master/proposals/lip-0039.md#proof-verification
export const filterQueries = <T extends { key: Buffer; binaryBitmap: string }>(
	queries: T[],
	keyLength: number,
): T[] => {
	const uniqueKeys: string[] = [];

	return queries.filter(q => {
		const h = q.binaryBitmap.length;
		const binaryKey = binaryExpansion(q.key, keyLength);
		const keyPrefix = binaryKey.substring(0, h);

		if (!uniqueKeys.includes(keyPrefix)) {
			uniqueKeys.push(keyPrefix);
			return true;
		}

		return false;
	});
};

// Checks whether two queries correspond to nodes that are
// children of the same branch node, with q1 and q2 the left and right
// child respectively
// https://github.com/LiskHQ/lips-staging/blob/master/proposals/lip-0039.md#proof-verification
export const areSiblingQueries = (
	q1: { key: Buffer; binaryBitmap: string },
	q2: { key: Buffer; binaryBitmap: string },
	keyLength: number,
): boolean => {
	if (q1.binaryBitmap.length !== q2.binaryBitmap.length) {
		return false;
	}

	const h = q1.binaryBitmap.length - 1;
	const binaryKey1 = binaryExpansion(q1.key, keyLength);
	const binaryKey2 = binaryExpansion(q2.key, keyLength);

	// end of string is exclusive
	const keyPrefix1 = binaryKey1.substring(0, h);
	const keyPrefix2 = binaryKey2.substring(0, h);

	if (keyPrefix1 !== keyPrefix2) {
		return false;
	}

	const d1 = binaryKey1[h];
	const d2 = binaryKey2[h];

	return (d1 === '0' && d2 === '1') || (d1 === '1' && d2 === '0');
};

// Calculate root for the given sibling hashes
// https://github.com/LiskHQ/lips-staging/blob/master/proposals/lip-0039.md#proof-verification
export const calculateRoot = (sibHashes: Buffer[], queries: Query[], keyLength: number): Buffer => {
	const siblingHashes = objects.cloneDeep(sibHashes);
	const data: CalculateRootQueryObjects[] = [];

	for (const q of queries) {
		data.push({
			key: q.key,
			value: q.value,
			binaryBitmap: bufferToBinaryString(q.bitmap),
			hash: q.value.byteLength === 0 ? EMPTY_HASH : hash(leafDataBuffer(q.key, q.value)),
		});
	}

	let sortedQueries = filterQueries<CalculateRootQueryObjects>(
		sortByBitmapAndKey<CalculateRootQueryObjects>(data),
		keyLength,
	);

	while (sortedQueries.length > 0) {
		const q = sortedQueries[0];

		// if the binaryBitmap is empty string, we reached the top of the tree
		if (q.binaryBitmap === '') {
			return q.hash;
		}

		const b = q.binaryBitmap[0];
		// h equals the height of the node; e.g., the root has h=0
		const h = q.binaryBitmap.length;
		const binaryKey = binaryExpansion(q.key, keyLength);

		// we distinguish three cases for the sibling hash:
		// 1. sibling is next element of sortedQueries
		let siblingHash!: Buffer;

		if (sortedQueries.length > 1 && areSiblingQueries(q, sortedQueries[1], keyLength)) {
			siblingHash = sortedQueries[1].hash;
			sortedQueries.splice(1, 1);
		}
		// 2. sibling is default empty node
		else if (b === '0') {
			siblingHash = EMPTY_HASH;
		}
		// 3. sibling hash comes from siblingHashes
		else if (b === '1') {
			// eslint-disable-next-line prefer-destructuring
			siblingHash = siblingHashes[0];
			siblingHashes.splice(0, 1);
		}

		const d = binaryKey[h - 1];
		if (d === '0') {
			q.hash = hash(branchDataBuffer(q.hash, siblingHash));
		} else if (d === '1') {
			q.hash = hash(branchDataBuffer(siblingHash, q.hash));
		}

		q.binaryBitmap = q.binaryBitmap.substring(1);
		sortedQueries = filterQueries(sortByBitmapAndKey(sortedQueries), keyLength);
	}

	throw new Error('Can not calculate root hash');
};

export const binaryExpansion = (k: Buffer, keyLengthInBytes: number) =>
	bufferToBinaryString(k).padStart(8 * keyLengthInBytes, '0');

export const bufferToBinaryString = (buf: Buffer) => {
	let result = '';

	for (let i = 0; i < buf.byteLength; i += 1) {
		const byteBin = buf.readUInt8(i).toString(2);
		result += i === 0 ? byteBin : byteBin.padStart(8, '0');
	}

	return result;
};

export const binaryStringToBuffer = (str: string) => {
	const byteSize = Math.ceil(str.length / 8);
	const buf = Buffer.alloc(byteSize);

	for (let i = 1; i <= byteSize; i += 1) {
		buf.writeUInt8(
			parseInt(str.substring(str.length - i * 8, str.length - i * 8 + 8), 2),
			byteSize - i,
		);
	}
	return buf;
};

export const getLeafData = (data: Buffer, keyLength: number): { key: Buffer; value: Buffer } => {
	// Get the key of keyLength size
	const key = data.slice(1, keyLength + 1);
	// Get data
	const value = data.slice(keyLength + 1, data.length);

	return {
		key,
		value,
	};
};
export const getBranchData = (
	data: Buffer,
	keyLength: number,
): { leftHash: Buffer; rightHash: Buffer } => {
	// Get left hash
	const leftHash = data.slice(-2 * keyLength, -1 * keyLength);
	// Get right hash
	const rightHash = data.slice(-1 * keyLength);

	return {
		leftHash,
		rightHash,
	};
};

export const leafDataBuffer = (key: Buffer, value: Buffer): Buffer =>
	Buffer.concat([LEAF_HASH_PREFIX, key, value]);

export const branchDataBuffer = (leftHash: Buffer, rightHash: Buffer): Buffer =>
	Buffer.concat([LEAF_HASH_PREFIX, leftHash, rightHash]);
