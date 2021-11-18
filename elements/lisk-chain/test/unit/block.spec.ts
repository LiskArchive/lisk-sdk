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
import { getRandomBytes, hash } from '@liskhq/lisk-cryptography';
import { Block, BlockAsset, BlockAssets, Transaction } from '../../src';
import { EMPTY_BUFFER, EMPTY_HASH } from '../../src/constants';
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
					moduleID: 3,
					data: getRandomBytes(64),
				},
				{
					moduleID: 6,
					data: getRandomBytes(64),
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
				block = await createValidDefaultBlock({ payload: [tx] });
				// Act & assert
				expect(() => block.validate()).toThrow();
			});
		});

		describe('when all the value is valid', () => {
			it('should not throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map(() => tx);
				block = await createValidDefaultBlock({ payload: txs, assets: blockAssets });
				// Act & assert
				expect(() => block.validate()).not.toThrow();
			});
		});

		describe('when transactionRoot is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map(() => tx);
				block = await createValidDefaultBlock({ payload: txs });
				block['header']['_transactionRoot'] = getRandomBytes(32);

				// Act & assert
				expect(() => block.validate()).toThrow('Invalid transaction root');
			});
		});

		describe('when assetsRoot is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				const assets = [
					{
						moduleID: 2,
						data: getRandomBytes(64),
					},
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
				];
				const txs = new Array(20).fill(0).map(() => tx);
				block = await createValidDefaultBlock({ payload: txs, assets: new BlockAssets(assets) });
				block['header']['_assetsRoot'] = getRandomBytes(32);

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
			previousBlockID: getRandomBytes(32),
			stateRoot: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
			transactionRoot: EMPTY_HASH,
			assetsRoot: EMPTY_HASH,
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
		let block: Block;
		let tx: Transaction;
		let assetList: BlockAsset[];
		let blockAssets: BlockAssets;

		beforeEach(() => {
			assetList = [
				{
					moduleID: 3,
					data: getRandomBytes(64),
				},
				{
					moduleID: 6,
					data: getRandomBytes(64),
				},
			];
			blockAssets = new BlockAssets(assetList);
			tx = getTransaction();
		});

		describe('when all values are valid', () => {
			it('should not throw error', async () => {
				// Arrange
				block = await createValidDefaultBlock({ header: getGenesisBlockAttrs(), payload: [] });
				block['header']['_signature'] = EMPTY_BUFFER;
				// Act & assert
				expect(() => block.validateGenesis()).not.toThrow();
			});
		});

		describe('when payload is not empty', () => {
			it('should throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map(() => tx);
				block = await createValidDefaultBlock({
					header: getGenesisBlockAttrs(),
					payload: txs,
					assets: blockAssets,
				});
				block['header']['_signature'] = EMPTY_BUFFER;
				// Act & assert
				expect(() => block.validateGenesis()).toThrow('Payload length must be zero');
			});
		});

		describe('when assetsRoot is invalid', () => {
			it('should throw error', async () => {
				// Arrange
				const assets = [
					{
						moduleID: 2,
						data: getRandomBytes(64),
					},
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
				];
				block = await createValidDefaultBlock({
					header: getGenesisBlockAttrs(),
					payload: [],
					assets: new BlockAssets(assets),
				});
				block['header']['_signature'] = EMPTY_BUFFER;
				block['header']['_assetsRoot'] = getRandomBytes(32);

				// Act & assert
				expect(() => block.validateGenesis()).toThrow('Invalid assets root');
			});
		});
	});
});
