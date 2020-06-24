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
import { RawBlockHeader } from '@liskhq/lisk-chain';
import {
	createGenesisBlock,
	genesisBlockSchema,
	genesisBlockHeaderSchema,
	genesisBlockHeaderAssetSchema,
	defaultAccountAssetSchema,
	GenesisBlock,
	DefaultAccountAsset,
	GenesisBlockHeaderAsset,
} from '../src';

import { validGenesisBlockParams } from './fixtures';
import { getHeaderAssetSchemaWithAccountAsset } from '../src/utils/schema';

const encodeGenesisBlock = (
	genesisBlock: GenesisBlock<DefaultAccountAsset>,
) => {
	const blockHeaderWithAccountAssetSchema = getHeaderAssetSchemaWithAccountAsset(
		genesisBlockHeaderAssetSchema,
		defaultAccountAssetSchema,
	);
	const genesisBlockAssetBuffer = codec.encode(
		blockHeaderWithAccountAssetSchema,
		genesisBlock.header.asset,
	);

	const genesisBlockHeaderBuffer = codec.encode(genesisBlockHeaderSchema, {
		...genesisBlock.header,
		asset: genesisBlockAssetBuffer,
	});

	const genesisBlockBuffer = codec.encode(genesisBlockSchema, {
		header: genesisBlockHeaderBuffer,
		payload: genesisBlock.payload,
	});

	return {
		genesisBlockBuffer,
		genesisBlockHeaderBuffer,
	};
};

const decodeGenesisBlock = (
	genesisBlockBuffer: Buffer,
): GenesisBlock<DefaultAccountAsset> => {
	const { header, payload } = codec.decode<{
		header: Buffer;
		payload: [];
	}>(genesisBlockSchema, genesisBlockBuffer);

	const blockHeaderWithAssetBuffer = codec.decode<RawBlockHeader>(
		genesisBlockHeaderSchema,
		header,
	);

	const blockHeaderAssetSchema = getHeaderAssetSchemaWithAccountAsset(
		genesisBlockHeaderAssetSchema,
		defaultAccountAssetSchema,
	);

	const blockHeaderAsset = codec.decode<
		GenesisBlockHeaderAsset<DefaultAccountAsset>
	>(blockHeaderAssetSchema, blockHeaderWithAssetBuffer.asset);

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
		const { genesisBlockBuffer, genesisBlockHeaderBuffer } = encodeGenesisBlock(
			genesisBlock,
		);

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
		const { genesisBlockBuffer: encodedBlockBuffer } = encodeGenesisBlock(
			genesisBlock,
		);

		// Act
		const decodedBlock = decodeGenesisBlock(encodedBlockBuffer);
		const { genesisBlockBuffer: doubleEncodedBlockBuffer } = encodeGenesisBlock(
			decodedBlock,
		);

		// Assert
		expect(decodedBlock).toEqual(genesisBlockWithoutId);
		expect(encodedBlockBuffer).toEqual(doubleEncodedBlockBuffer);
	});
});
