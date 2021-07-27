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
 */

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { BlockHeader } from '../../src/block_header';

const getBlockAttrs = () => ({
	version: 1,
	timestamp: 1009988,
	height: 10,
	generatorAddress: getRandomBytes(20),
	previousBlockID: getRandomBytes(20),
	stateRoot: getRandomBytes(20),
	transactionRoot: getRandomBytes(20),
	assets: [
		{ moduleID: 1, data: getRandomBytes(20) },
		{ moduleID: 2, data: getRandomBytes(20) },
	],
});

describe('BlockHeader', () => {
	describe('constructor', () => {
		it('should initialize block header object', () => {
			const data = getBlockAttrs();

			const blockHeader = new BlockHeader(data);

			expect(blockHeader).toBeInstanceOf(BlockHeader);
			expect(blockHeader.version).toEqual(data.version);
			expect(blockHeader.timestamp).toEqual(data.timestamp);
			expect(blockHeader.height).toEqual(data.height);
			expect(blockHeader.generatorAddress).toEqual(data.generatorAddress);
			expect(blockHeader.previousBlockID).toEqual(data.previousBlockID);
			expect(blockHeader.stateRoot).toEqual(data.stateRoot);
			expect(blockHeader.transactionRoot).toEqual(data.transactionRoot);
			expect(blockHeader.getAsset(1)).toEqual(data.assets[0].data);
			expect(blockHeader.getAsset(2)).toEqual(data.assets[1].data);
			expect(blockHeader.id).toEqual(Buffer.alloc(0));
			expect(blockHeader.signature).toEqual(Buffer.alloc(0));
		});
	});

	describe('getAsset', () => {
		it('should get relevant module asset if exists', () => {
			const data = getBlockAttrs();
			const blockHeader = new BlockHeader(data);

			expect(blockHeader.getAsset(1)).toEqual(data.assets[0].data);
		});

		it('should return undefined if module asset does not exists', () => {
			const data = getBlockAttrs();
			const blockHeader = new BlockHeader(data);

			expect(blockHeader.getAsset(3)).toBeUndefined();
		});
	});
});
