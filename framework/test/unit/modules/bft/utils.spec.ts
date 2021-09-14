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

import { BIG_ENDIAN, getRandomBytes, intToBuffer } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { StateStore } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { createFakeBlockHeader } from '../../../../src/testing';
import {
	areDistinctHeadersContradicting,
	getBFTParameters,
	getBlockBFTProperties,
} from '../../../../src/modules/bft/utils';
import { MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS } from '../../../../src/modules/bft/constants';
import { BFTParameters, bftParametersSchema } from '../../../../src/modules/bft/schemas';
import { BFTParameterNotFoundError } from '../../../../src/modules/bft/errors';

describe('bft utils', () => {
	const generatorAddress = getRandomBytes(20);

	it('should return false when generatorAddress does not match', () => {
		const header1 = createFakeBlockHeader({
			generatorAddress,
		});
		const header2 = createFakeBlockHeader({
			generatorAddress: getRandomBytes(20),
		});

		expect(areDistinctHeadersContradicting(header1, header2)).toBeFalse();
	});

	describe('areDistinctHeadersContradicting', () => {
		it('should return true when first height is equal to second height but equal maxHeightPrevoted', () => {
			const header1 = createFakeBlockHeader({
				height: 10999,
				maxHeightPrevoted: 1099,
				generatorAddress,
			});
			const header2 = createFakeBlockHeader({
				height: 10999,
				maxHeightPrevoted: 1099,
				generatorAddress,
			});

			expect(areDistinctHeadersContradicting(header1, header2)).toBeTrue();
		});

		it('should return true when first height is greater than the second height but equal maxHeightPrevoted', () => {
			const header1 = createFakeBlockHeader({
				height: 10999,
				maxHeightPrevoted: 1099,
				generatorAddress,
			});
			const header2 = createFakeBlockHeader({
				height: 11999,
				maxHeightPrevoted: 1099,
				generatorAddress,
			});

			expect(areDistinctHeadersContradicting(header1, header2)).toBeTrue();
		});

		it("should return true when height is greater than the second header's maxHeightGenerated", () => {
			const header1 = createFakeBlockHeader({
				generatorAddress,
				height: 120,
			});
			const header2 = createFakeBlockHeader({
				generatorAddress,
				height: 123,
				maxHeightGenerated: 98,
			});

			expect(areDistinctHeadersContradicting(header1, header2)).toBeTrue();
		});

		it('should return true when maxHeightPrevoted is greater than the second maxHeightPrevoted', () => {
			const header1 = createFakeBlockHeader({
				generatorAddress,
				height: 133,
				maxHeightPrevoted: 101,
			});
			const header2 = createFakeBlockHeader({
				generatorAddress,
				height: 123,
				maxHeightPrevoted: 98,
			});

			expect(areDistinctHeadersContradicting(header1, header2)).toBeTrue();
		});

		it('should false when headers are not contradicting', () => {
			const header1 = createFakeBlockHeader({
				generatorAddress,
				height: 133,
				maxHeightGenerated: 50,
				maxHeightPrevoted: 101,
			});
			const header2 = createFakeBlockHeader({
				generatorAddress,
				height: 153,
				maxHeightPrevoted: 121,
				maxHeightGenerated: 133,
			});
			expect(areDistinctHeadersContradicting(header1, header2)).toBeFalse();
		});
	});

	describe('getBlockBFTProperties', () => {
		it('should return new bft block properties', () => {
			const header = createFakeBlockHeader();
			const bftProps = getBlockBFTProperties(header);

			expect(bftProps.generatorAddress).toEqual(header.generatorAddress);
			expect(bftProps.maxHeightGenerated).toEqual(header.maxHeightGenerated);
			expect(bftProps.maxHeightPrevoted).toEqual(header.maxHeightPrevoted);
			expect(bftProps.maxHeightPrevoted).toEqual(0);
			expect(bftProps.precommitWeight).toEqual(0);
		});
	});

	describe('getBFTParameters', () => {
		let db: KVStore;
		let stateStore: StateStore;
		let bftParams1: BFTParameters;
		let bftParams2: BFTParameters;

		beforeEach(async () => {
			db = new InMemoryKVStore() as never;
			const rootStore = new StateStore(db);
			const paramsStore = rootStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);
			const height1Bytes = intToBuffer(309, 4, BIG_ENDIAN);
			bftParams1 = {
				prevoteThreshold: BigInt(20),
				precommitThreshold: BigInt(30),
				certificateThreshold: BigInt(40),
				validators: [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(10),
					},
				],
				validatorsHash: getRandomBytes(32),
			};
			await paramsStore.set(height1Bytes, codec.encode(bftParametersSchema, bftParams1));
			const height2Bytes = intToBuffer(515, 4, BIG_ENDIAN);
			bftParams2 = {
				prevoteThreshold: BigInt(40),
				precommitThreshold: BigInt(50),
				certificateThreshold: BigInt(60),
				validators: [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(5),
					},
				],
				validatorsHash: getRandomBytes(32),
			};
			await paramsStore.set(height2Bytes, codec.encode(bftParametersSchema, bftParams2));
			const batch = db.batch();
			rootStore.finalize(batch);
			await batch.write();

			stateStore = new StateStore(db);
		});

		it('should throw if BFT parameters greater than the height does not exist', async () => {
			const paramsStore = stateStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);

			await expect(getBFTParameters(paramsStore, 1014)).rejects.toThrow(BFTParameterNotFoundError);
		});

		it('should return if BFT parameters equal to the input height exist', async () => {
			const paramsStore = stateStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);

			await expect(getBFTParameters(paramsStore, 515)).resolves.toEqual(bftParams2);
		});

		it('should return if BFT parameters greater than the input height exist', async () => {
			const paramsStore = stateStore.getStore(MODULE_ID_BFT, STORE_PREFIX_BFT_PARAMETERS);

			await expect(getBFTParameters(paramsStore, 330)).resolves.toEqual(bftParams2);
		});
	});
});
