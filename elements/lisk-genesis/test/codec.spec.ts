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

import { codec } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import {
	RawBlockHeader,
	getGenesisBlockHeaderAssetSchema,
	GenesisBlock,
	GenesisBlockHeader,
	blockHeaderSchema,
	blockSchema,
} from '@liskhq/lisk-chain';
import { createGenesisBlock } from '../src';

import { validGenesisBlockParams, defaultAccountSchema } from './fixtures';

const encodeGenesisBlock = (genesisBlock: GenesisBlock) => {
	const blockHeaderWithAccountAssetSchema = getGenesisBlockHeaderAssetSchema(defaultAccountSchema);
	const genesisBlockAssetBuffer = codec.encode(
		blockHeaderWithAccountAssetSchema,
		genesisBlock.header.asset,
	);

	const genesisBlockHeaderBuffer = codec.encode(blockHeaderSchema, {
		...genesisBlock.header,
		asset: genesisBlockAssetBuffer,
	});

	const genesisBlockBuffer = codec.encode(blockSchema, {
		header: genesisBlockHeaderBuffer,
		payload: genesisBlock.payload,
	});

	return {
		genesisBlockBuffer,
		genesisBlockHeaderBuffer,
	};
};

const decodeGenesisBlock = (genesisBlockBuffer: Buffer): GenesisBlock => {
	const { header, payload } = codec.decode<{
		header: Buffer;
		payload: [];
	}>(blockSchema, genesisBlockBuffer);

	const blockHeaderWithAssetBuffer = codec.decode<RawBlockHeader>(blockHeaderSchema, header);

	const blockHeaderAssetSchema = getGenesisBlockHeaderAssetSchema(defaultAccountSchema);

	const blockHeaderAsset = codec.decode<GenesisBlockHeader['asset']>(
		blockHeaderAssetSchema,
		blockHeaderWithAssetBuffer.asset,
	);

	return {
		header: {
			...blockHeaderWithAssetBuffer,
			asset: blockHeaderAsset,
		},
		payload,
	};
};

describe('encoding/decoding', () => {
	it('should be able to encode the genesis block', () => {
		// Arrange
		const genesisBlock = createGenesisBlock(validGenesisBlockParams);

		// Act
		const { genesisBlockBuffer, genesisBlockHeaderBuffer } = encodeGenesisBlock(genesisBlock);

		// Assert
		expect(genesisBlockBuffer).toBeInstanceOf(Buffer);
		expect(hash(genesisBlockHeaderBuffer)).toEqual(genesisBlock.header.id);
	});

	it('should be able to decode the genesis block', () => {
		// Arrange
		const genesisBlock = createGenesisBlock(validGenesisBlockParams);
		const { id, ...genesisBlockHeaderWithoutId } = genesisBlock.header;
		const genesisBlockWithoutId = {
			header: genesisBlockHeaderWithoutId,
			payload: genesisBlock.payload,
		};
		const { genesisBlockBuffer: encodedBlockBuffer } = encodeGenesisBlock(genesisBlock);

		// Act
		const decodedBlock = decodeGenesisBlock(encodedBlockBuffer);
		const { genesisBlockBuffer: doubleEncodedBlockBuffer } = encodeGenesisBlock(decodedBlock);

		// Assert
		expect(decodedBlock).toEqual(genesisBlockWithoutId);
		expect(encodedBlockBuffer).toEqual(doubleEncodedBlockBuffer);
	});
});
