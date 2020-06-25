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

import { hash } from '@liskhq/lisk-cryptography';
import { LEAF_PREFIX } from './constants';
import { NodeLocation, NodeSide } from './types';

export const isLeaf = (value: Buffer): boolean =>
	value.compare(Buffer.alloc(0)) !== 0 && value[0] === LEAF_PREFIX[0];

export const generateHash = (
	prefix: Buffer,
	leftHash: Buffer,
	rightHash: Buffer,
): Buffer =>
	hash(
		Buffer.concat(
			[prefix, leftHash, rightHash],
			prefix.length + leftHash.length + rightHash.length,
		),
    );

export const getMaxIdxAtLayer = (layer: number, datalength: number): number => {
    let [max, r] = [datalength, 0];
    for (let i = 0; i < layer; i += 1) {
        // eslint-disable-next-line
        [max, r] = [[Math.floor, Math.ceil][r % 2](max / 2), r + (max % 2)];
    }
    return max;
};

export const getLayerStructure = (datalength: number): number[] => {
	const structure = [];
	for (let i = 0; i <= Math.ceil(Math.log2(datalength)); i += 1) {
		structure.push(getMaxIdxAtLayer(i, datalength));
	}

	return structure;
};

export const getBinary = (num: number, length: number): number[] => {
	if (length === 0) return [];
	let binaryString = num.toString(2);
	while (binaryString.length < length) binaryString = `0${binaryString}`;

	return binaryString.split('').map(d => parseInt(d, 10));
};