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
import { MerkleTree } from '@liskhq/lisk-tree';
import { BlockAsset, BlockAssets } from '../../src';
import { MAX_ASSET_DATA_SIZE_BYTES } from '../../src/constants';

describe('block assets', () => {
	let assets: BlockAssets;
	let assetList: BlockAsset[];

	beforeEach(() => {
		assetList = [
			{
				module: 'auth',
				data: utils.getRandomBytes(64),
			},
			{
				module: 'random',
				data: utils.getRandomBytes(64),
			},
		];
		assets = new BlockAssets(assetList);
	});

	describe('sort', () => {
		it('should sort the assets in ascending order by module', () => {
			assets.sort();
			expect(assets['_assets'][0].module).toBe('auth');
		});
	});

	describe('getAsset', () => {
		it('it should return undefined if no matching asset exists ', () => {
			expect(assets.getAsset('transfer')).toBeUndefined();
		});

		it('it should return asset data if matching asset exists ', () => {
			expect(assets.getAsset('auth')).toBeInstanceOf(Buffer);
		});
	});

	describe('setAsset', () => {
		it('it should not overwrite existing asset', () => {
			const data = utils.getRandomBytes(32);
			expect(() => assets.setAsset('random', data)).toThrow();
		});

		it('it should add asset data if matching asset does not exist ', () => {
			const data = utils.getRandomBytes(32);
			assets.setAsset('token', data);
			expect(assets['_assets']).toHaveLength(3);
		});
	});

	describe('fromJSON', () => {
		it('should create BlockAssets from JSON format', () => {
			assets = BlockAssets.fromJSON([
				{
					module: 'random',
					data: utils.getRandomBytes(30).toString('hex'),
				},
			]);
			expect(assets['_assets']).toHaveLength(1);
			expect(assets.getAsset('random')).toBeInstanceOf(Buffer);
		});
	});

	describe('getRoot', () => {
		it('should calculate and return asset root', async () => {
			const root = await assets.getRoot();
			const merkleT = new MerkleTree();
			await merkleT.init(assets.getBytes());
			await expect(assets.getRoot()).resolves.toEqual(root);
		});
	});

	describe('getAllAsset', () => {
		it('should return list of all assets', () => {
			expect(assets.getAll()).toContainAllValues(assetList);
		});
	});

	describe('validate', () => {
		describe('when block asset schema is invalid', () => {
			it(`should throw error when data type is incorrect`, () => {
				assetList = [
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(128),
					},
				];
				assets = new BlockAssets(assetList);
				assets['_assets'][0] = '3' as any;

				expect(() => assets.validate()).toThrow();
			});

			it(`should throw error when module name is invalid`, () => {
				assetList = [
					{
						module: 'auth-',
						data: utils.getRandomBytes(64),
					},
				];
				assets = new BlockAssets(assetList);

				expect(() => assets.validate()).toThrow('Invalid module name');
			});
		});

		describe('when an asset data has size more than the limit', () => {
			it(`should throw error when asset data length is greater than ${MAX_ASSET_DATA_SIZE_BYTES}`, () => {
				assetList = [
					{
						module: 'auth',
						data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES + 1),
					},
				];
				assets = new BlockAssets(assetList);
				expect(() => assets.validate()).toThrow(
					`Module with ID ${assetList[1].module} has data size more than ${MAX_ASSET_DATA_SIZE_BYTES} bytes.`,
				);
			});

			it(`should pass when asset data length is equal or less than ${MAX_ASSET_DATA_SIZE_BYTES}`, () => {
				assetList = [
					{
						module: 'auth',
						data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES / 2),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(MAX_ASSET_DATA_SIZE_BYTES / 2),
					},
				];
				assets = new BlockAssets(assetList);
				expect(assets.validate()).toBeUndefined();
			});
		});

		describe('when the assets are not sorted by module', () => {
			it('should throw error when assets are not sorted by module', () => {
				assetList = [
					{
						module: 'random',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
				];
				assets = new BlockAssets(assetList);
				expect(() => assets.validate()).toThrow(
					'Assets are not sorted by the module property value in lexicographical order.',
				);
			});

			it('should pass when assets are sorted by module', () => {
				assetList = [
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(64),
					},
				];
				assets = new BlockAssets(assetList);
				expect(assets.validate()).toBeUndefined();
			});
		});

		describe('when there are multiple asset entries for a moduleID', () => {
			it('should throw error when there are more than 1 assets for a module', () => {
				assetList = [
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(64),
					},
				];
				assets = new BlockAssets(assetList);
				expect(() => assets.validate()).toThrow(
					`Module with ID ${assetList[1].module} has duplicate entries.`,
				);
			});

			it('should pass when there is atmost 1 asset for a module', () => {
				assetList = [
					{
						module: 'amd',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(64),
					},
				];
				assets = new BlockAssets(assetList);
				expect(assets.validate()).toBeUndefined();
			});
		});
	});

	describe('validateGenesis', () => {
		describe('when block asset schema is invalid', () => {
			it(`should throw error when data type is incorrect`, () => {
				assetList = [
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(128),
					},
				];
				assets = new BlockAssets(assetList);
				assets['_assets'][0] = '3' as any;
				expect(() => assets.validateGenesis()).toThrow();
			});
		});

		describe('when an asset data has size more than the limit', () => {
			it(`should pass when asset data length is greater than ${MAX_ASSET_DATA_SIZE_BYTES}`, () => {
				assetList = [
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(128),
					},
				];
				assets = new BlockAssets(assetList);
				expect(assets.validateGenesis()).toBeUndefined();
			});

			it(`should pass when asset data length is equal or less than ${MAX_ASSET_DATA_SIZE_BYTES}`, () => {
				assetList = [
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(64),
					},
				];
				assets = new BlockAssets(assetList);
				expect(assets.validateGenesis()).toBeUndefined();
			});
		});

		describe('when the assets are not sorted by moduleID', () => {
			it('should throw error when assets are not sorted by moduleID', () => {
				assetList = [
					{
						module: 'random',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
				];
				assets = new BlockAssets(assetList);
				expect(() => assets.validateGenesis()).toThrow(
					'Assets are not sorted by the module property value in lexicographical order.',
				);
			});

			it('should pass when assets are sorted by moduleID', () => {
				assetList = [
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(64),
					},
				];
				assets = new BlockAssets(assetList);
				expect(assets.validateGenesis()).toBeUndefined();
			});
		});

		describe('when there are multiple asset entries for a moduleID', () => {
			it('should throw error when there are more than 1 assets for a module', () => {
				assetList = [
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(64),
					},
				];
				assets = new BlockAssets(assetList);
				expect(() => assets.validateGenesis()).toThrow(
					`Module with ID ${assetList[1].module} has duplicate entries.`,
				);
			});

			it('should pass when there is atmost 1 asset for a module', () => {
				assetList = [
					{
						module: 'amd',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'auth',
						data: utils.getRandomBytes(64),
					},
					{
						module: 'random',
						data: utils.getRandomBytes(64),
					},
				];
				assets = new BlockAssets(assetList);
				expect(assets.validateGenesis()).toBeUndefined();
			});
		});
	});
});
