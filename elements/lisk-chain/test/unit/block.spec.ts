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
import { utils } from '@liskhq/lisk-cryptography';
import { Block, BlockAsset, BlockAssets, Transaction } from '../../src';
import { EMPTY_BUFFER, EMPTY_HASH, MAX_ASSET_DATA_SIZE_BYTES } from '../../src/constants';
import { createValidDefaultBlock } from '../utils/block';
import { getTransaction } from '../utils/transaction';

describe('block', () => {
	describe('validate', () => {
		let block: Block;
		let tx: Transaction;
		let assetList: BlockAsset[];
		let blockAssets: BlockAssets;

		beforeEach(() => {
			assetList = [
				{
					module: 'auth',
					data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES),
				},
				{
					module: 'random',
					data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES),
				},
			];
			blockAssets = new BlockAssets(assetList);
			tx = getTransaction();
		});

		describe('when previousBlockID is empty', () => {
			it('should throw error', async () => {
				// Arrange
				block = await createValidDefaultBlock({
					header: { previousBlockID: Buffer.alloc(0) },
					assets: blockAssets,
				});
				// Act & assert
				expect(() => block.validate()).toThrow('Previous block id must not be empty');
			});
		});

		describe('when a transaction included is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				(tx.senderPublicKey as any) = '100';
				tx['_id'] = Buffer.from('123');
				block = await createValidDefaultBlock({ transactions: [tx] });
				// Act & assert
				expect(() => block.validate()).toThrow();
			});
		});

		describe('when all the value is valid', () => {
			it('should not throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map(() => tx);
				block = await createValidDefaultBlock({ transactions: txs, assets: blockAssets });
				// Act & assert
				expect(() => block.validate()).not.toThrow();
			});
		});

		describe('when transactionRoot is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map(() => tx);
				block = await createValidDefaultBlock({ transactions: txs });
				block['header']['_transactionRoot'] = utils.getRandomBytes(32);

				// Act & assert
				expect(() => block.validate()).toThrow('Invalid transaction root');
			});
		});

		describe('when assetRoot is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				const assets = [
					{
						module: 'auth',
						data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES),
					},
				];
				const txs = new Array(20).fill(0).map(() => tx);
				block = await createValidDefaultBlock({
					transactions: txs,
					assets: new BlockAssets(assets),
				});
				block['header']['_assetRoot'] = utils.getRandomBytes(32);

				// Act & assert
				expect(() => block.validate()).toThrow('Invalid assets root');
			});
		});
	});

	describe('validateGenesis', () => {
		const getGenesisBlockAttrs = () => ({
			version: 1,
			timestamp: 1009988,
			height: 1009988,
			previousBlockID: utils.getRandomBytes(32),
			stateRoot: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
			transactionRoot: EMPTY_HASH,
			assetRoot: EMPTY_HASH,
			generatorAddress: Buffer.alloc(20, 0),
			maxHeightPrevoted: 1009988,
			maxHeightGenerated: 0,
			validatorsHash: utils.hash(Buffer.alloc(0)),
			aggregateCommit: {
				height: 1009988,
				aggregationBits: Buffer.alloc(0),
				certificateSignature: EMPTY_BUFFER,
			},
			signature: EMPTY_BUFFER,
		});
		let block: Block;
		let tx: Transaction;
		let assetList: BlockAsset[];
		let blockAssets: BlockAssets;

		beforeEach(() => {
			assetList = [
				{
					module: 'auth',
					data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES),
				},
				{
					module: 'random',
					data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES),
				},
			];
			blockAssets = new BlockAssets(assetList);
			tx = getTransaction();
		});

		describe('when all values are valid', () => {
			it('should not throw error', async () => {
				// Arrange
				block = await createValidDefaultBlock({ header: getGenesisBlockAttrs(), transactions: [] });
				block['header']['_signature'] = EMPTY_BUFFER;
				// Act & assert
				expect(() => block.validateGenesis()).not.toThrow();
			});
		});

		describe('when transactions is not empty', () => {
			it('should throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map(() => tx);
				block = await createValidDefaultBlock({
					header: getGenesisBlockAttrs(),
					transactions: txs,
					assets: blockAssets,
				});
				block['header']['_signature'] = EMPTY_BUFFER;
				// Act & assert
				expect(() => block.validateGenesis()).toThrow('Transactions length must be zero');
			});
		});

		describe('when assetRoot is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				const assets = [
					{
						module: 'auth',
						data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES),
					},
				];
				block = await createValidDefaultBlock({
					header: getGenesisBlockAttrs(),
					transactions: [],
					assets: new BlockAssets(assets),
				});
				block['header']['_signature'] = EMPTY_BUFFER;
				block['header']['_assetRoot'] = utils.getRandomBytes(32);

				// Act & assert
				expect(() => block.validateGenesis()).toThrow('Invalid assets root');
			});
		});
	});
});
