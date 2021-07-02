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
import { BRANCH_HASH_PREFIX, EMPTY_HASH, LEAF_HASH_PREFIX } from './constants';
import { InclusionProofQuery, InclusionProofQueryWithHash } from './types';

// Sort queries by the longest binaryBitmap, breaking ties by smaller key.
// https://github.com/LiskHQ/lips-staging/blob/master/proposals/lip-0039.md#proof-construction
export const sortByBitmapAndKey = <T extends InclusionProofQuery>(queries: T[]): T[] =>
	queries.sort((q1, q2) => {
		const q1BinaryBitmap = bufferToBinaryString(q1.bitmap);
		const q2BinaryBitmap = bufferToBinaryString(q2.bitmap);

		if (q1BinaryBitmap.length === q2BinaryBitmap.length) {
			return q1.key.byteLength - q2.key.byteLength;
		}

		return q2BinaryBitmap.length - q1BinaryBitmap.length;
	});

// Remove queries that have merged together, keep only those with a different key prefix
// https://github.com/LiskHQ/lips-staging/blob/master/proposals/lip-0039.md#proof-verification
export const filterQueries = <T extends InclusionProofQuery>(
	queries: T[],
	keyLength: number,
): T[] => {
	const uniqueKeys: string[] = [];

	return queries.filter(q => {
		const binaryBitmap = bufferToBinaryString(q.bitmap);
		const h = binaryBitmap.length;
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
	q1: InclusionProofQuery,
	q2: InclusionProofQuery,
	keyLength: number,
): boolean => {
	const q1BinaryBitmap = bufferToBinaryString(q1.bitmap);
	const q2BinaryBitmap = bufferToBinaryString(q2.bitmap);

	if (q1BinaryBitmap.length !== q2BinaryBitmap.length) {
		return false;
	}

	const h = q1BinaryBitmap.length;
	const binaryKey1 = binaryExpansion(q1.key, keyLength);
	const binaryKey2 = binaryExpansion(q2.key, keyLength);

	// end of string is exclusive
	const keyPrefix1 = binaryKey1.substring(0, h - 1);
	const keyPrefix2 = binaryKey2.substring(0, h - 1);

	if (keyPrefix1 !== keyPrefix2) {
		return false;
	}

	const d1 = binaryKey1[h];
	const d2 = binaryKey2[h];

	return (d1 === '0' && d2 === '1') || (d1 === '1' && d2 === '0');
};

// Calculate root for the given sibling hashes
// https://github.com/LiskHQ/lips-staging/blob/master/proposals/lip-0039.md#proof-verification
export const calculateRoot = (
	sibHashes: Buffer[],
	queries: InclusionProofQuery[],
	keyLength: number,
): Buffer => {
	let siblingHashes = objects.cloneDeep(sibHashes);
	const data: InclusionProofQueryWithHash[] = [];

	for (const q of queries) {
		data.push({
			...q,
			binaryBitmap: bufferToBinaryString(q.bitmap),
			hash: q.value.byteLength === 0 ? EMPTY_HASH : leafHash(q.key, q.value),
		});
	}

	let sortedQueries = filterQueries<InclusionProofQueryWithHash>(
		sortByBitmapAndKey<InclusionProofQueryWithHash>(data),
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
			sortedQueries = sortedQueries.splice(1, 1);
		}
		// 2. sibling is default empty node
		else if (b === '0') {
			siblingHash = EMPTY_HASH;
		}
		// 3. sibling hash comes from siblingHashes
		else if (b === '1') {
			// eslint-disable-next-line prefer-destructuring
			siblingHash = siblingHashes[0];
			siblingHashes = siblingHashes.splice(0, 1);
		}

		const d = binaryKey[h - 1];
		if (d === '0') {
			q.hash = branchHash(q.hash, siblingHash);
		} else if (d === '1') {
			q.hash = branchHash(siblingHash, q.hash);
		}

		q.binaryBitmap = q.binaryBitmap.substring(1);
		sortedQueries = sortByBitmapAndKey(sortedQueries);
		sortedQueries = filterQueries(sortedQueries, keyLength);
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

export const leafHash = (key: Buffer, value: Buffer): Buffer =>
	hash(Buffer.concat([LEAF_HASH_PREFIX, key, value]));

export const branchHash = (leftHash: Buffer, rightHash: Buffer): Buffer =>
	hash(Buffer.concat([BRANCH_HASH_PREFIX, leftHash, rightHash]));
