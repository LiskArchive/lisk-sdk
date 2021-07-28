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

import {
	BlockHeader,
	blockHeaderSchema,
	blockHeaderSchemaWithId,
	signingBlockHeaderSchema,
} from '../../src/block_header';

const getBlockAttrs = () => ({
	version: 1,
	timestamp: 1009988,
	height: 1009988,
	previousBlockID: Buffer.from('4a462ea57a8c9f72d866c09770e5ec70cef18727', 'hex'),
	stateRoot: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
	transactionRoot: Buffer.from('b27ca21f40d44113c2090ca8f05fb706c54e87dd', 'hex'),
	generatorAddress: Buffer.from('be63fb1c0426573352556f18b21efd5b6183c39c', 'hex'),
	assets: [
		{ moduleID: 1, data: Buffer.from('aab2fe3588d6f4ff3d735fb998faf5e80a4da5d4', 'hex') },
		{ moduleID: 2, data: Buffer.from('b19531270ec52845bd51ed897d8d14d86bd5a1f8', 'hex') },
	],
	signature: Buffer.from('6da88e2fd4435e26e02682435f108002ccc3ddd5', 'hex'),
});

const blockId = Buffer.from(
	'9c80710aed045e039a9d6ddd638de52bfc69c722891c0f28654e3f69ed2b139a',
	'hex',
);

const blockHeaderBytes = Buffer.from(
	'080110c4d23d18c4d23d22144a462ea57a8c9f72d866c09770e5ec70cef187272a147f9d96a09a3fd17f3478eb7bef3a8bda00e1238b3214b27ca21f40d44113c2090ca8f05fb706c54e87dd3a14be63fb1c0426573352556f18b21efd5b6183c39c421808011214aab2fe3588d6f4ff3d735fb998faf5e80a4da5d4421808021214b19531270ec52845bd51ed897d8d14d86bd5a1f84a146da88e2fd4435e26e02682435f108002ccc3ddd5',
	'hex',
);

const blockHeaderProps = [
	'version',
	'timestamp',
	'height',
	'previousBlockID',
	'stateRoot',
	'transactionRoot',
	'generatorAddress',
	'assets',
];

describe('block_header', () => {
	describe('signingBlockHeaderSchema', () => {
		it('should be valid schema without signature or id', () => {
			expect(signingBlockHeaderSchema).toMatchSnapshot();
			expect(Object.keys(signingBlockHeaderSchema.properties)).toIncludeAllMembers([
				...blockHeaderProps,
			]);
			expect(Object.keys(signingBlockHeaderSchema.properties)).not.toIncludeAllMembers([
				'id',
				'signature',
			]);
		});
	});

	describe('blockHeaderSchema', () => {
		it('should be valid schema with signature but without id', () => {
			expect(blockHeaderSchema).toMatchSnapshot();
			expect(Object.keys(blockHeaderSchema.properties)).toIncludeAllMembers([
				...blockHeaderProps,
				'signature',
			]);
			expect(Object.keys(blockHeaderSchema.properties)).not.toIncludeAllMembers(['id']);
		});
	});

	describe('blockHeaderSchemaWithId', () => {
		it('should be valid schema with signature and id', () => {
			expect(blockHeaderSchemaWithId).toMatchSnapshot();
			expect(Object.keys(blockHeaderSchemaWithId.properties)).toIncludeAllMembers([
				...blockHeaderProps,
				'signature',
				'id',
			]);
		});
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
				expect(blockHeader.id).toEqual(blockId);
				expect(blockHeader.signature).toEqual(data.signature);
			});
		});

		describe('fromBytes', () => {
			it('should load the block header from bytes', () => {
				const blockHeader = BlockHeader.fromBytes(blockHeaderBytes);

				expect(blockHeader.toObject()).toEqual({ ...getBlockAttrs(), id: blockId });
			});
		});

		describe('validate', () => {
			it('should validate the block header without error', () => {
				const data = getBlockAttrs();
				const blockHeader = new BlockHeader(data);

				expect(blockHeader.validate()).toBeUndefined();
			});

			it('should throw error if previous block id is not set', () => {
				const data = getBlockAttrs();
				const blockHeader = new BlockHeader({ ...data, previousBlockID: Buffer.alloc(0) });

				expect(() => blockHeader.validate()).toThrow('Previous block id must not be empty.');
			});
		});

		describe('signature', () => {
			it('should throw error if block header not signed', () => {
				const { signature, ...rest } = getBlockAttrs();
				const blockHeader = new BlockHeader(rest);

				expect(() => blockHeader.signature).toThrow('Block header is not signed.');
			});
		});

		describe('id', () => {
			it('should throw error if block header not signed', () => {
				const { signature, ...rest } = getBlockAttrs();
				const blockHeader = new BlockHeader(rest);

				expect(() => blockHeader.id).toThrow('Can not generate the id for unsigned block header.');
			});

			it('should not throw error if block header is signed', () => {
				const data = getBlockAttrs();
				const blockHeader = new BlockHeader(data);

				expect(blockHeader.id).toEqual(blockId);
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
});
