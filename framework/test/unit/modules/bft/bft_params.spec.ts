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

import { StateStore } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { InMemoryDatabase, Database, Batch } from '@liskhq/lisk-db';
import {
	MODULE_STORE_PREFIX_BFT,
	STORE_PREFIX_BFT_PARAMETERS,
} from '../../../../src/engine/bft/constants';
import { BFTParameterNotFoundError } from '../../../../src/engine/bft/errors';
import {
	BFTParametersCache,
	deleteBFTParameters,
	getBFTParameters,
} from '../../../../src/engine/bft/bft_params';
import { BFTParameters, bftParametersSchema } from '../../../../src/engine/bft/schemas';

describe('BFT parameters', () => {
	describe('getBFTParameters', () => {
		let db: Database;
		let stateStore: StateStore;
		let bftParams1: BFTParameters;
		let bftParams2: BFTParameters;

		beforeEach(async () => {
			db = new InMemoryDatabase() as never;
			const rootStore = new StateStore(db);
			const paramsStore = rootStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
			const height1Bytes = utils.intToBuffer(309, 4);
			bftParams1 = {
				prevoteThreshold: BigInt(20),
				precommitThreshold: BigInt(30),
				certificateThreshold: BigInt(40),
				validators: [
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(10),
						blsKey: utils.getRandomBytes(42),
						generatorKey: utils.getRandomBytes(32),
					},
				],
				validatorsHash: utils.getRandomBytes(32),
			};
			await paramsStore.set(height1Bytes, codec.encode(bftParametersSchema, bftParams1));
			const height2Bytes = utils.intToBuffer(515, 4);
			bftParams2 = {
				prevoteThreshold: BigInt(40),
				precommitThreshold: BigInt(50),
				certificateThreshold: BigInt(60),
				validators: [
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(5),
						blsKey: utils.getRandomBytes(42),
						generatorKey: utils.getRandomBytes(32),
					},
				],
				validatorsHash: utils.getRandomBytes(32),
			};
			await paramsStore.set(height2Bytes, codec.encode(bftParametersSchema, bftParams2));
			const batch = new Batch();
			rootStore.finalize(batch);
			await db.write(batch);

			stateStore = new StateStore(db);
		});

		it('should throw if BFT parameters lower than the height does not exist', async () => {
			const paramsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);

			await expect(getBFTParameters(paramsStore, 308)).rejects.toThrow(BFTParameterNotFoundError);
		});

		it('should return if BFT parameters equal to the input height exist', async () => {
			const paramsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);

			await expect(getBFTParameters(paramsStore, 514)).resolves.toEqual(bftParams1);
		});

		it('should return if BFT parameters lower than the input height exist', async () => {
			const paramsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);

			await expect(getBFTParameters(paramsStore, 1024)).resolves.toEqual(bftParams2);
		});
	});

	describe('deleteBFTParameters', () => {
		let db: Database;
		let stateStore: StateStore;
		let bftParams1: BFTParameters;
		let bftParams2: BFTParameters;

		beforeEach(async () => {
			db = new InMemoryDatabase() as never;
			const rootStore = new StateStore(db);
			const paramsStore = rootStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
			const height1Bytes = utils.intToBuffer(309, 4);
			bftParams1 = {
				prevoteThreshold: BigInt(20),
				precommitThreshold: BigInt(30),
				certificateThreshold: BigInt(40),
				validators: [
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(10),
						blsKey: utils.getRandomBytes(42),
						generatorKey: utils.getRandomBytes(32),
					},
				],
				validatorsHash: utils.getRandomBytes(32),
			};
			await paramsStore.set(height1Bytes, codec.encode(bftParametersSchema, bftParams1));
			const height2Bytes = utils.intToBuffer(515, 4);
			bftParams2 = {
				prevoteThreshold: BigInt(40),
				precommitThreshold: BigInt(50),
				certificateThreshold: BigInt(60),
				validators: [
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(5),
						blsKey: utils.getRandomBytes(42),
						generatorKey: utils.getRandomBytes(32),
					},
				],
				validatorsHash: utils.getRandomBytes(32),
			};
			await paramsStore.set(height2Bytes, codec.encode(bftParametersSchema, bftParams2));
			const batch = new Batch();
			rootStore.finalize(batch);
			await db.write(batch);

			stateStore = new StateStore(db);
		});

		it('should not delete anything if the param does not exist for the heigt', async () => {
			const paramsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
			jest.spyOn(paramsStore, 'del');
			await deleteBFTParameters(paramsStore, 308);

			expect(paramsStore.del).not.toHaveBeenCalled();
		});

		it('should delete all params strictly lower than height if the param exist for the heigt', async () => {
			const paramsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
			jest.spyOn(paramsStore, 'del');
			await deleteBFTParameters(paramsStore, 515);

			expect(paramsStore.del).toHaveBeenCalledTimes(1);
			expect(paramsStore.del).toHaveBeenCalledWith(utils.intToBuffer(309, 4));
		});
	});

	describe('BFTParametersCache', () => {
		describe('cache', () => {
			let db: Database;

			it('should cache params for the specified range', async () => {
				db = new InMemoryDatabase() as never;
				const rootStore = new StateStore(db);
				const paramsStore = rootStore.getStore(
					MODULE_STORE_PREFIX_BFT,
					STORE_PREFIX_BFT_PARAMETERS,
				);
				const height1Bytes = utils.intToBuffer(104, 4);
				const bftParams1 = {
					prevoteThreshold: BigInt(20),
					precommitThreshold: BigInt(30),
					certificateThreshold: BigInt(40),
					validators: [
						{
							address: utils.getRandomBytes(20),
							bftWeight: BigInt(10),
							blsKey: utils.getRandomBytes(42),
							generatorKey: utils.getRandomBytes(32),
						},
					],
					validatorsHash: utils.getRandomBytes(32),
				};
				await paramsStore.set(height1Bytes, codec.encode(bftParametersSchema, bftParams1));
				const height2Bytes = utils.intToBuffer(207, 4);
				const bftParams2 = {
					prevoteThreshold: BigInt(40),
					precommitThreshold: BigInt(50),
					certificateThreshold: BigInt(60),
					validators: [
						{
							address: utils.getRandomBytes(20),
							bftWeight: BigInt(5),
							blsKey: utils.getRandomBytes(42),
							generatorKey: utils.getRandomBytes(32),
						},
					],
					validatorsHash: utils.getRandomBytes(32),
				};
				await paramsStore.set(height2Bytes, codec.encode(bftParametersSchema, bftParams2));
				const height3Bytes = utils.intToBuffer(310, 4);
				const bftParams3 = {
					prevoteThreshold: BigInt(40),
					precommitThreshold: BigInt(50),
					certificateThreshold: BigInt(60),
					validators: [
						{
							address: utils.getRandomBytes(20),
							bftWeight: BigInt(5),
							blsKey: utils.getRandomBytes(42),
							generatorKey: utils.getRandomBytes(32),
						},
					],
					validatorsHash: utils.getRandomBytes(32),
				};
				await paramsStore.set(height3Bytes, codec.encode(bftParametersSchema, bftParams3));
				const batch = new Batch();
				rootStore.finalize(batch);
				await db.write(batch);

				const stateStore = new StateStore(db);
				const targetParamsStore = stateStore.getStore(
					MODULE_STORE_PREFIX_BFT,
					STORE_PREFIX_BFT_PARAMETERS,
				);
				jest.spyOn(targetParamsStore, 'iterate');

				const paramsCache = new BFTParametersCache(targetParamsStore);

				const start = 110;
				const end = 323;
				await paramsCache.cache(start, end);

				for (let i = start; i < end; i += 1) {
					await expect(paramsCache.getParameters(i)).toResolve();
				}
				await expect(paramsCache.getParameters(start)).resolves.toEqual(bftParams1);
				await expect(paramsCache.getParameters(207)).resolves.toEqual(bftParams2);
				await expect(paramsCache.getParameters(end)).resolves.toEqual(bftParams3);
				expect(targetParamsStore.iterate).toHaveBeenCalledTimes(2);
			});
		});
	});
});
