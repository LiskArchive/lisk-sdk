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
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { Block, BlockAsset, BlockAssets, Transaction } from '../../src';
import { MAX_ASSET_DATA_SIZE_BYTES } from '../../src/constants';
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

		describe('when block asset schema is invalid', () => {
			it(`should throw error when data type is incorrect`, async () => {
				// Arrange
				const assets = [
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
					{
						moduleID: 4,
						data: getRandomBytes(128),
					},
				];
				const validAssets = new BlockAssets(assets);
				validAssets['_assets'][0] = '3' as any;
				block = await createValidDefaultBlock({ assets: validAssets });

				expect(() => block.validate()).toThrow();
			});
		});

		describe('when an asset data has size more than the limit', () => {
			it(`should throw error when asset data length is greater than ${MAX_ASSET_DATA_SIZE_BYTES}`, async () => {
				// Arrange
				const assets = [
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
					{
						moduleID: 4,
						data: getRandomBytes(128),
					},
				];
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(() => block.validate()).toThrow(
					`Module with ID ${assets[1].moduleID} has data size more than ${MAX_ASSET_DATA_SIZE_BYTES} bytes.`,
				);
			});

			it(`should pass when asset data length is equal or less than ${MAX_ASSET_DATA_SIZE_BYTES}`, async () => {
				// Arrange
				const assets = [
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
					{
						moduleID: 4,
						data: getRandomBytes(64),
					},
				];
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(block.validate()).toBeUndefined();
			});
		});

		describe('when the assets are not sorted by moduleID', () => {
			it('should throw error when assets are not sorted by moduleID', async () => {
				// Arrange
				const assets = [
					{
						moduleID: 4,
						data: getRandomBytes(64),
					},
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
				];
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(() => block.validate()).toThrow(
					'Assets are not sorted in the increasing values of moduleID.',
				);
			});

			it('should pass when assets are sorted by moduleID', async () => {
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
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(block.validate()).toBeUndefined();
			});
		});

		describe('when there are multiple asset entries for a moduleID', () => {
			it('should throw error when there are more than 1 assets for a module', async () => {
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
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
				];
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(() => block.validate()).toThrow(
					`Module with ID ${assets[1].moduleID} has duplicate entries.`,
				);
			});

			it('should pass when there is atmost 1 asset for a module', async () => {
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
					{
						moduleID: 4,
						data: getRandomBytes(64),
					},
				];
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(block.validate()).toBeUndefined();
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
				block = await createValidDefaultBlock({ payload: [], assets: blockAssets });
				// Act & assert
				expect(() => block.validateGenesis()).not.toThrow();
			});
		});

		describe('when payload is not empty', () => {
			it('should throw error', async () => {
				// Arrange
				const txs = new Array(20).fill(0).map(() => tx);
				block = await createValidDefaultBlock({ payload: txs, assets: blockAssets });
				// Act & assert
				expect(() => block.validateGenesis()).toThrow('Payload length must be zero');
			});
		});

		describe('when block asset schema is invalid', () => {
			it(`should throw error when data type is incorrect`, async () => {
				// Arrange
				const assets = [
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
					{
						moduleID: 4,
						data: getRandomBytes(128),
					},
				];
				const validAssets = new BlockAssets(assets);
				validAssets['_assets'][0] = '3' as any;
				block = await createValidDefaultBlock({ assets: validAssets });

				expect(() => block.validateGenesis()).toThrow();
			});
		});

		describe('when an asset data has size more than the limit', () => {
			it(`should not throw error when asset data length is greater than ${MAX_ASSET_DATA_SIZE_BYTES}`, async () => {
				// Arrange
				const assets = [
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
					{
						moduleID: 4,
						data: getRandomBytes(128),
					},
				];
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(() => block.validateGenesis()).not.toThrow();
			});

			it(`should pass when asset data length is equal or less than ${MAX_ASSET_DATA_SIZE_BYTES}`, async () => {
				// Arrange
				const assets = [
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
					{
						moduleID: 4,
						data: getRandomBytes(64),
					},
				];
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(block.validateGenesis()).toBeUndefined();
			});
		});

		describe('when the assets are not sorted by moduleID', () => {
			it('should throw error when assets are not sorted by moduleID', async () => {
				// Arrange
				const assets = [
					{
						moduleID: 4,
						data: getRandomBytes(64),
					},
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
				];
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(() => block.validateGenesis()).toThrow(
					'Assets are not sorted in the increasing values of moduleID.',
				);
			});

			it('should pass when assets are sorted by moduleID', async () => {
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
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(block.validateGenesis()).toBeUndefined();
			});
		});

		describe('when there are multiple asset entries for a moduleID', () => {
			it('should throw error when there are more than 1 assets for a module', async () => {
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
					{
						moduleID: 3,
						data: getRandomBytes(64),
					},
				];
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(() => block.validateGenesis()).toThrow(
					`Module with ID ${assets[1].moduleID} has duplicate entries.`,
				);
			});

			it('should pass when there is atmost 1 asset for a module', async () => {
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
					{
						moduleID: 4,
						data: getRandomBytes(64),
					},
				];
				block = await createValidDefaultBlock({ assets: new BlockAssets(assets) });
				// Act & assert
				expect(block.validateGenesis()).toBeUndefined();
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
				block = await createValidDefaultBlock({ payload: [], assets: new BlockAssets(assets) });
				block['header']['_assetsRoot'] = getRandomBytes(32);

				// Act & assert
				expect(() => block.validateGenesis()).toThrow('Invalid assets root');
			});
		});
	});
});
