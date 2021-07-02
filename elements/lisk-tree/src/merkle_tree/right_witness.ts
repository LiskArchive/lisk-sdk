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
/* eslint-disable no-bitwise */
import { BRANCH_PREFIX } from './constants';
import { generateHash } from './utils';

const popFirst = (val: Buffer[]): Buffer => {
	const [first] = val;
	val.splice(0, 1);
	return first;
};

const getRootFromPath = (paths: Buffer[]): Buffer => {
	if (!paths.length) {
		throw new Error('Invalid append path');
	}
	let [currentHash] = paths;
	for (let index = 1; index < paths.length; index += 1) {
		currentHash = generateHash(BRANCH_PREFIX, paths[index], currentHash);
	}
	return currentHash;
};

export const calculateRootFromRightWitness = (
	idx: number,
	appendPath: Buffer[],
	rightWitness: Buffer[],
): Buffer => {
	if (!appendPath.length) {
		return getRootFromPath(rightWitness);
	}
	if (!rightWitness.length) {
		return getRootFromPath(appendPath);
	}
	const updatingAppendPath = appendPath.slice();
	const updatingRightWitness = rightWitness.slice();

	let layerIndex = 0;
	let incrementalIdx = idx;
	const firstAppendPath = popFirst(updatingAppendPath);
	const firstRightWitness = popFirst(updatingRightWitness);
	let currentHash = generateHash(BRANCH_PREFIX, firstAppendPath, firstRightWitness);
	let incrementalIdxInitialized = false;

	while (updatingAppendPath.length > 0 || updatingRightWitness.length > 0) {
		const idxDigit = (idx >>> layerIndex) & 1;
		if (updatingAppendPath.length > 0 && idxDigit === 1) {
			if (!incrementalIdxInitialized) {
				incrementalIdx += 1 << layerIndex;
				incrementalIdxInitialized = true;
			} else {
				const leftHash = popFirst(updatingAppendPath);
				currentHash = generateHash(BRANCH_PREFIX, leftHash, currentHash);
			}
		}
		const incrementalIdxDigit = (incrementalIdx >>> layerIndex) & 1;
		if (updatingRightWitness.length > 0 && incrementalIdxDigit === 1) {
			const rightHash = popFirst(updatingRightWitness);
			currentHash = generateHash(BRANCH_PREFIX, currentHash, rightHash);
			incrementalIdx += 1 << layerIndex;
		}
		layerIndex += 1;
	}
	return currentHash;
};

export const verifyRightWitness = (
	idx: number,
	appendPath: Buffer[],
	rightWitness: Buffer[],
	root: Buffer,
): boolean => {
	const calculatedRoot = calculateRootFromRightWitness(idx, appendPath, rightWitness);
	return calculatedRoot.equals(root);
};
