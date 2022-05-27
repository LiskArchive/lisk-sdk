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
import { hash, getRandomBytes } from '@liskhq/lisk-cryptography';
import { BlockHeader } from '../../src/block_header';
import { EMPTY_BUFFER, EMPTY_HASH } from '../../src/constants';
import {
	blockHeaderSchema,
	blockHeaderSchemaWithId,
	signingBlockHeaderSchema,
} from '../../src/schema';

const getBlockAttrs = () => ({
	version: 1,
	timestamp: 1009988,
	height: 1009988,
	previousBlockID: Buffer.from('4a462ea57a8c9f72d866c09770e5ec70cef18727', 'hex'),
	stateRoot: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
	transactionRoot: Buffer.from('b27ca21f40d44113c2090ca8f05fb706c54e87dd', 'hex'),
	assetsRoot: Buffer.from('b27ca21f40d44113c2090ca8f05fb706c54e87dd', 'hex'),
	eventRoot: Buffer.from('30dda4fbc395828e5a9f2f8824771e434fce4945a1e7820012440d09dd1e2b6d', 'hex'),
	generatorAddress: Buffer.from('be63fb1c0426573352556f18b21efd5b6183c39c', 'hex'),
	maxHeightPrevoted: 1000988,
	maxHeightGenerated: 1000988,
	validatorsHash: hash(Buffer.alloc(0)),
	aggregateCommit: {
		height: 0,
		aggregationBits: Buffer.alloc(0),
		certificateSignature: Buffer.alloc(0),
	},
	signature: Buffer.from('6da88e2fd4435e26e02682435f108002ccc3ddd5', 'hex'),
});

const getGenesisBlockAttrs = () => ({
	version: 1,
	timestamp: 1009988,
	height: 1009988,
	previousBlockID: getRandomBytes(32),
	stateRoot: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
	transactionRoot: EMPTY_HASH,
	assetsRoot: EMPTY_HASH,
	eventRoot: EMPTY_HASH,
	generatorAddress: EMPTY_BUFFER,
	maxHeightPrevoted: 1009988,
	maxHeightGenerated: 0,
	validatorsHash: hash(Buffer.alloc(0)),
	aggregateCommit: {
		height: 0,
		aggregationBits: Buffer.alloc(0),
		certificateSignature: EMPTY_BUFFER,
	},
	signature: EMPTY_BUFFER,
});

const blockId = Buffer.from(
	'f14104e384546adaba487af56e658188eea07bb534a61b4cbb9ccaee54139b8c',
	'hex',
);

const blockHeaderBytes = Buffer.from(
	'080110c4d23d18c4d23d22144a462ea57a8c9f72d866c09770e5ec70cef187272a14be63fb1c0426573352556f18b21efd5b6183c39c3214b27ca21f40d44113c2090ca8f05fb706c54e87dd3a14b27ca21f40d44113c2090ca8f05fb706c54e87dd422030dda4fbc395828e5a9f2f8824771e434fce4945a1e7820012440d09dd1e2b6d4a147f9d96a09a3fd17f3478eb7bef3a8bda00e1238b509c8c3d589c8c3d6220e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8556a06080012001a0072146da88e2fd4435e26e02682435f108002ccc3ddd5',
	'hex',
);

const blockHeaderProps = [
	'version',
	'timestamp',
	'height',
	'previousBlockID',
	'generatorAddress',
	'transactionRoot',
	'assetsRoot',
	'stateRoot',
	'maxHeightPrevoted',
	'maxHeightGenerated',
	'validatorsHash',
	'aggregateCommit',
];

describe('block_header', () => {
	describe('signingBlockHeaderSchema', () => {
		it('should be valid schema without signature and id', () => {
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
				expect(blockHeader.eventRoot).toEqual(data.eventRoot);
				expect(blockHeader.validatorsHash).toEqual(data.validatorsHash);
				expect(blockHeader.aggregateCommit).toEqual(data.aggregateCommit);
				expect(blockHeader.maxHeightPrevoted).toEqual(data.maxHeightPrevoted);
				expect(blockHeader.maxHeightGenerated).toEqual(data.maxHeightGenerated);
				expect(blockHeader.assetsRoot).toEqual(data.assetsRoot);
				expect(blockHeader.transactionRoot).toEqual(data.transactionRoot);
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
			it('should validate the block header without error if all the properties are valid', () => {
				const data = getBlockAttrs();
				data.signature = Buffer.from(
					'41f7d923c8957664923b49d7a893153476bc60e0392702cf111a26a92d74279a00c41f1999504c9faeee7b3d05393ca04d61a0768c3ae4d324f3097ab0b52201',
					'hex',
				);
				const blockHeader = new BlockHeader(data);

				expect(blockHeader.validate()).toBeUndefined();
			});

			it('should throw error if previous block id is not set', () => {
				const data = getBlockAttrs();
				const blockHeader = new BlockHeader({ ...data, previousBlockID: Buffer.alloc(0) });

				expect(() => blockHeader.validate()).toThrow('Previous block id must not be empty.');
			});

			it('should throw error if signature length is not correct', () => {
				const data = getBlockAttrs();
				const blockHeader = new BlockHeader(data);

				expect(() => blockHeader.validate()).toThrow('Signature length must be 64 bytes.');
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

		describe('validateGenesis', () => {
			it('should throw error if previousBlockID is not 32 bytes', () => {
				const block = getGenesisBlockAttrs();
				const blockHeader = new BlockHeader({ ...block, previousBlockID: getRandomBytes(31) });

				expect(() => blockHeader.validateGenesis()).toThrow(
					'Genesis block header previousBlockID must be 32 bytes',
				);
			});

			it('should throw error if transactionRoot is not empty hash', () => {
				const block = getGenesisBlockAttrs();
				const blockHeader = new BlockHeader({ ...block, transactionRoot: getRandomBytes(32) });

				expect(() => blockHeader.validateGenesis()).toThrow(
					'Genesis block header transaction root must be empty hash',
				);
			});

			it('should throw error if generatorAddress is not empty buffer', () => {
				const block = getGenesisBlockAttrs();
				const blockHeader = new BlockHeader({ ...block, generatorAddress: getRandomBytes(32) });

				expect(() => blockHeader.validateGenesis()).toThrow(
					'Genesis block header generatorAddress must be empty bytes',
				);
			});

			it('should throw error if maxHeightPrevoted is not equal to header.height', () => {
				const block = getGenesisBlockAttrs();
				const blockHeader = new BlockHeader({ ...block, maxHeightPrevoted: 10 });

				expect(() => blockHeader.validateGenesis()).toThrow(
					'Genesis block header maxHeightPrevoted must equal height',
				);
			});

			it('should throw error if aggregateCommit.height is not equal to 0', () => {
				const block = getGenesisBlockAttrs();
				const blockHeader = new BlockHeader({
					...block,
					aggregateCommit: { ...block.aggregateCommit, height: 10 },
				});

				expect(() => blockHeader.validateGenesis()).toThrow(
					'Genesis block header aggregateCommit.height must equal 0',
				);
			});

			it('should throw error if aggregateCommit.certificateSignature is not empty buffer', () => {
				const block = getGenesisBlockAttrs();
				const blockHeader = new BlockHeader({
					...block,
					aggregateCommit: { ...block.aggregateCommit, certificateSignature: getRandomBytes(32) },
				});

				expect(() => blockHeader.validateGenesis()).toThrow(
					'Genesis block header aggregateCommit.certificateSignature must be empty bytes',
				);
			});

			it('should throw error if aggregateCommit.aggregationBits is not empty buffer', () => {
				const block = getGenesisBlockAttrs();
				const blockHeader = new BlockHeader({
					...block,
					aggregateCommit: { ...block.aggregateCommit, aggregationBits: getRandomBytes(32) },
				});

				expect(() => blockHeader.validateGenesis()).toThrow(
					'Genesis block header aggregateCommit.aggregationBits must be empty bytes',
				);
			});

			it('should throw error if signature is not empty buffer', () => {
				const block = getGenesisBlockAttrs();
				const blockHeader = new BlockHeader({ ...block, signature: getRandomBytes(32) });

				expect(() => blockHeader.validateGenesis()).toThrow(
					'Genesis block header signature must be empty bytes',
				);
			});
		});
	});
});
