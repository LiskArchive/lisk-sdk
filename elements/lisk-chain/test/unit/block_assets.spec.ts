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
import { BlockAssets } from '../../src';

describe('block assets', () => {
	describe('validate', () => {
		let assets: BlockAssets;

		beforeEach(() => {
			assets = new BlockAssets([
				{
					moduleID: 6,
					data: getRandomBytes(64),
				},
				{
					moduleID: 3,
					data: getRandomBytes(64),
				},
			]);
		});

		describe('sort', () => {
			it('should sort the assets in ascending order by module ID', () => {
				assets.sort();
				expect(assets['_assets'][0].moduleID).toEqual(3);
			});
		});

		describe('getAsset', () => {
			it('it should return undefined if no matching asset exists ', () => {
				expect(assets.getAsset(5)).toBeUndefined();
			});

			it('it should return asset data if matching asset exists ', () => {
				expect(assets.getAsset(3)).toBeInstanceOf(Buffer);
			});
		});

		describe('setAsset', () => {
			it('it should not overwrite existing asset', () => {
				const data = getRandomBytes(32);
				expect(() => assets.setAsset(3, data)).toThrow();
			});

			it('it should add asset data if matching asset does not exist ', () => {
				const data = getRandomBytes(32);
				assets.setAsset(4, data);
				expect(assets['_assets']).toHaveLength(3);
			});
		});

		describe('fromJSON', () => {
			it('should create BlockAssets from JSON format', () => {
				assets = BlockAssets.fromJSON([
					{
						moduleID: 4,
						data: getRandomBytes(30).toString('hex'),
					},
				]);
				expect(assets['_assets']).toHaveLength(1);
				expect(assets.getAsset(4)).toBeInstanceOf(Buffer);
			});
		});
	});
});
