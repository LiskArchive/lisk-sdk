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
import { InMemoryDatabase } from '@liskhq/lisk-db';
import { BFTMethod } from '../../../../src/engine/bft/method';
import {
	EMPTY_KEY,
	MODULE_STORE_PREFIX_BFT,
	STORE_PREFIX_BFT_PARAMETERS,
	STORE_PREFIX_BFT_VOTES,
} from '../../../../src/engine/bft/constants';
import { BFTParameterNotFoundError } from '../../../../src/engine/bft/errors';
import {
	BFTParameters,
	bftParametersSchema,
	BFTVotes,
	BFTVotesBlockInfo,
	bftVotesSchema,
	validatorsHashInputSchema,
} from '../../../../src/engine/bft/schemas';
import { createFakeBlockHeader } from '../../../../src/testing';

describe('BFT Method', () => {
	let bftMethod: BFTMethod;
	let validatorsMethod: { getValidatorAccount: jest.Mock };
	let stateStore: StateStore;

	beforeEach(() => {
		bftMethod = new BFTMethod();
		validatorsMethod = { getValidatorAccount: jest.fn() };
		bftMethod.init(103, 0, 10);
	});

	describe('areHeadersContradicting', () => {
		it('should return false when blocks are identical', () => {
			const header1 = createFakeBlockHeader({
				generatorAddress: utils.getRandomBytes(20),
			});
			expect(bftMethod.areHeadersContradicting(header1, header1)).toBeFalse();
		});

		it('should return true when blocks contradicting', () => {
			const generatorAddress = utils.getRandomBytes(20);
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
			expect(bftMethod.areHeadersContradicting(header1, header2)).toBeTrue();
		});

		it('should return false when blocks are notcontradicting', () => {
			const header1 = createFakeBlockHeader({
				height: 10999,
				maxHeightPrevoted: 1099,
				generatorAddress: utils.getRandomBytes(20),
			});
			const header2 = createFakeBlockHeader({
				height: 10999,
				maxHeightPrevoted: 1099,
				generatorAddress: utils.getRandomBytes(20),
			});
			expect(bftMethod.areHeadersContradicting(header1, header2)).toBeFalse();
		});
	});

	describe('isHeaderContradictingChain', () => {
		const generatorAddress = utils.getRandomBytes(20);

		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryDatabase());
			const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
			await votesStore.setWithSchema(
				EMPTY_KEY,
				{
					maxHeightPrevoted: 10,
					maxHeightPrecommitted: 0,
					maxHeightCertified: 0,
					blockBFTInfos: [
						{
							height: 3,
							generatorAddress,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
						{
							height: 2,
							generatorAddress: utils.getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
						{
							height: 1,
							generatorAddress: utils.getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
					],
					activeValidatorsVoteInfo: [],
				},
				bftVotesSchema,
			);
		});

		it('should return true when blockBFTInfos includes the block from the same generator and conflicting', async () => {
			await expect(
				bftMethod.isHeaderContradictingChain(
					stateStore,
					createFakeBlockHeader({
						height: 4,
						generatorAddress,
						maxHeightGenerated: 1,
						maxHeightPrevoted: 1,
					}),
				),
			).resolves.toBeTrue();
		});

		it('should return false when blockBFTInfos includes the block from the same generator but not conflicting', async () => {
			await expect(
				bftMethod.isHeaderContradictingChain(
					stateStore,
					createFakeBlockHeader({
						height: 4,
						generatorAddress,
						maxHeightGenerated: 3,
						maxHeightPrevoted: 1,
					}),
				),
			).resolves.toBeFalse();
		});

		it('should return false when blockBFTInfos does not include the block from the same generator', async () => {
			await expect(
				bftMethod.isHeaderContradictingChain(
					stateStore,
					createFakeBlockHeader({
						height: 4,
						generatorAddress: utils.getRandomBytes(20),
						maxHeightGenerated: 1,
						maxHeightPrevoted: 1,
					}),
				),
			).resolves.toBeFalse();
		});
	});

	describe('existBFTParameters', () => {
		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryDatabase());
			const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
			await votesStore.setWithSchema(
				utils.intToBuffer(20, 4),
				{
					prevoteThreshold: BigInt(68),
					precommitThreshold: BigInt(68),
					certificateThreshold: BigInt(68),
					validators: [],
					validatorsHash: utils.getRandomBytes(32),
				},
				bftParametersSchema,
			);
		});

		it('should return true if the BFT parameter exist for the height', async () => {
			await expect(bftMethod.existBFTParameters(stateStore, 20)).resolves.toBeTrue();
		});

		it('should return false if the BFT parameter does not exist for the height', async () => {
			await expect(bftMethod.existBFTParameters(stateStore, 10)).resolves.toBeFalse();
		});
	});

	describe('getBFTParameters', () => {
		const createParam = () => ({
			prevoteThreshold: BigInt(68),
			precommitThreshold: BigInt(68),
			certificateThreshold: BigInt(68),
			validators: [
				{
					address: utils.getRandomBytes(20),
					bftWeight: BigInt(1),
					blsKey: utils.getRandomBytes(48),
					generatorKey: utils.getRandomBytes(32),
				},
				{
					address: utils.getRandomBytes(20),
					bftWeight: BigInt(1),
					generatorKey: utils.getRandomBytes(32),
					blsKey: utils.getRandomBytes(48),
				},
			],
			validatorsHash: utils.getRandomBytes(32),
		});
		const params20 = createParam();
		const params30 = createParam();

		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryDatabase());
			const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
			await votesStore.setWithSchema(utils.intToBuffer(20, 4), params20, bftParametersSchema);
			await votesStore.setWithSchema(utils.intToBuffer(30, 4), params30, bftParametersSchema);
		});

		it('should return BFT parameters if it exists for the lower height', async () => {
			await expect(bftMethod.getBFTParameters(stateStore, 25)).resolves.toEqual(params20);
		});

		it('should return BFT parameters if it exists for the height', async () => {
			await expect(bftMethod.getBFTParameters(stateStore, 20)).resolves.toEqual(params20);
		});

		it('should throw if the BFT parameter does not exist for the height or lower', async () => {
			await expect(bftMethod.getBFTParameters(stateStore, 19)).rejects.toThrow(
				BFTParameterNotFoundError,
			);
		});
	});

	describe('getBFTHeights', () => {
		const generatorAddress = utils.getRandomBytes(20);

		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryDatabase());
			const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
			await votesStore.setWithSchema(
				EMPTY_KEY,
				{
					maxHeightPrevoted: 10,
					maxHeightPrecommitted: 8,
					maxHeightCertified: 1,
					blockBFTInfos: [
						{
							height: 3,
							generatorAddress,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
						{
							height: 2,
							generatorAddress: utils.getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
						{
							height: 1,
							generatorAddress: utils.getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
					],
					activeValidatorsVoteInfo: [],
				},
				bftVotesSchema,
			);
		});

		it('should return current BFT heights', async () => {
			await expect(bftMethod.getBFTHeights(stateStore)).resolves.toEqual({
				maxHeightPrevoted: 10,
				maxHeightPrecommitted: 8,
				maxHeightCertified: 1,
			});
		});
	});

	describe('impliesMaximalPrevotes', () => {
		const generatorAddress = utils.getRandomBytes(20);

		beforeEach(() => {
			stateStore = new StateStore(new InMemoryDatabase());
		});

		const testImpliesMaximalPrevotes = async (
			target: BFTVotesBlockInfo,
			list: BFTVotesBlockInfo[],
			expected: boolean,
		) => {
			const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
			await votesStore.setWithSchema(
				EMPTY_KEY,
				{
					maxHeightPrevoted: 10,
					maxHeightPrecommitted: 8,
					maxHeightCertified: 1,
					blockBFTInfos: [...list],
					activeValidatorsVoteInfo: [],
				},
				bftVotesSchema,
			);
			await expect(bftMethod.impliesMaximalPrevotes(stateStore, target)).resolves.toEqual(expected);
		};

		it('should throw if the input is not consecutive or equal to the block in bftBlockInfos', async () => {
			const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
			await votesStore.setWithSchema(
				EMPTY_KEY,
				{
					maxHeightPrevoted: 10,
					maxHeightPrecommitted: 8,
					maxHeightCertified: 1,
					blockBFTInfos: [
						{
							height: 102,
							generatorAddress,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
						{
							height: 101,
							generatorAddress: utils.getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
					],
					activeValidatorsVoteInfo: [],
				},
				bftVotesSchema,
			);

			await expect(
				bftMethod.impliesMaximalPrevotes(stateStore, {
					height: 105,
					generatorAddress: utils.getRandomBytes(20),
					maxHeightGenerated: 1,
				}),
			).rejects.toThrow('Input header with height 105 is invalid.');
		});

		// eslint-disable-next-line jest/expect-expect
		it('should return false when bftInfoBlocks is empty and height is equal to maxHeightGenerated', async () => {
			await testImpliesMaximalPrevotes(
				{
					height: 120,
					generatorAddress: utils.getRandomBytes(20),
					maxHeightGenerated: 120,
					maxHeightPrevoted: 0,
					prevoteWeight: BigInt(0),
					precommitWeight: BigInt(0),
				},
				[],
				false,
			);
		});

		// eslint-disable-next-line jest/expect-expect
		it('should return true when bftInfoBlocks is empty and height greater than maxHeightGenerated', async () => {
			await testImpliesMaximalPrevotes(
				{
					height: 121,
					generatorAddress: utils.getRandomBytes(20),
					maxHeightGenerated: 120,
					maxHeightPrevoted: 0,
					prevoteWeight: BigInt(0),
					precommitWeight: BigInt(0),
				},
				[],
				true,
			);
		});

		// eslint-disable-next-line jest/expect-expect
		it('should return false if maxHeightGenerated is greater than the height', async () => {
			await testImpliesMaximalPrevotes(
				{
					height: 103,
					generatorAddress: utils.getRandomBytes(20),
					maxHeightGenerated: 120,
					maxHeightPrevoted: 0,
					prevoteWeight: BigInt(0),
					precommitWeight: BigInt(0),
				},
				[
					{
						height: 102,
						generatorAddress,
						maxHeightGenerated: 0,
						maxHeightPrevoted: 0,
						prevoteWeight: BigInt(0),
						precommitWeight: BigInt(0),
					},
					{
						height: 101,
						generatorAddress: utils.getRandomBytes(20),
						maxHeightGenerated: 0,
						maxHeightPrevoted: 0,
						prevoteWeight: BigInt(0),
						precommitWeight: BigInt(0),
					},
				],
				false,
			);
		});

		// eslint-disable-next-line jest/expect-expect
		it('should return true if blockBFTInfo does not contain the information', async () => {
			await testImpliesMaximalPrevotes(
				{
					height: 103,
					generatorAddress: utils.getRandomBytes(20),
					maxHeightGenerated: 1,
					maxHeightPrevoted: 0,
					prevoteWeight: BigInt(0),
					precommitWeight: BigInt(0),
				},
				[
					{
						height: 102,
						generatorAddress,
						maxHeightGenerated: 0,
						maxHeightPrevoted: 0,
						prevoteWeight: BigInt(0),
						precommitWeight: BigInt(0),
					},
					{
						height: 101,
						generatorAddress: utils.getRandomBytes(20),
						maxHeightGenerated: 0,
						maxHeightPrevoted: 0,
						prevoteWeight: BigInt(0),
						precommitWeight: BigInt(0),
					},
				],
				true,
			);
		});

		// eslint-disable-next-line jest/expect-expect
		it('should return true if previous height is above limit of blockBFTInfos', async () => {
			await testImpliesMaximalPrevotes(
				{
					height: 211,
					generatorAddress: utils.getRandomBytes(20),
					maxHeightGenerated: 1,
					maxHeightPrevoted: 0,
					prevoteWeight: BigInt(0),
					precommitWeight: BigInt(0),
				},
				new Array(206).fill(0).map((_, i) => ({
					height: 210 - i,
					generatorAddress: utils.getRandomBytes(20),
					maxHeightGenerated: 0,
					maxHeightPrevoted: 0,
					prevoteWeight: BigInt(0),
					precommitWeight: BigInt(0),
				})),
				true,
			);
		});

		// eslint-disable-next-line jest/expect-expect
		it('should return false if maxHeightGenerated is the end of blockBFTInfos and generated by different address', async () => {
			await testImpliesMaximalPrevotes(
				{
					height: 211,
					generatorAddress: utils.getRandomBytes(20),
					maxHeightGenerated: 5,
					maxHeightPrevoted: 0,
					prevoteWeight: BigInt(0),
					precommitWeight: BigInt(0),
				},
				new Array(206).fill(0).map((_, i) => ({
					height: 210 - i,
					generatorAddress: utils.getRandomBytes(20),
					maxHeightGenerated: 0,
					maxHeightPrevoted: 0,
					prevoteWeight: BigInt(0),
					precommitWeight: BigInt(0),
				})),
				false,
			);
		});

		// eslint-disable-next-line jest/expect-expect
		it('should return false if the last generated height is generated by different address', async () => {
			await testImpliesMaximalPrevotes(
				{
					height: 103,
					generatorAddress: utils.getRandomBytes(20),
					maxHeightGenerated: 101,
					maxHeightPrevoted: 0,
					prevoteWeight: BigInt(0),
					precommitWeight: BigInt(0),
				},
				[
					{
						height: 102,
						generatorAddress,
						maxHeightGenerated: 0,
						maxHeightPrevoted: 0,
						prevoteWeight: BigInt(0),
						precommitWeight: BigInt(0),
					},
					{
						height: 101,
						generatorAddress: utils.getRandomBytes(20),
						maxHeightGenerated: 0,
						maxHeightPrevoted: 0,
						prevoteWeight: BigInt(0),
						precommitWeight: BigInt(0),
					},
				],
				false,
			);
		});

		// eslint-disable-next-line jest/expect-expect
		it('should return true when it is consecutive valid block header', async () => {
			await testImpliesMaximalPrevotes(
				{
					height: 103,
					generatorAddress,
					maxHeightGenerated: 102,
					maxHeightPrevoted: 0,
					prevoteWeight: BigInt(0),
					precommitWeight: BigInt(0),
				},
				[
					{
						height: 102,
						generatorAddress,
						maxHeightGenerated: 0,
						maxHeightPrevoted: 0,
						prevoteWeight: BigInt(0),
						precommitWeight: BigInt(0),
					},
					{
						height: 101,
						generatorAddress: utils.getRandomBytes(20),
						maxHeightGenerated: 0,
						maxHeightPrevoted: 0,
						prevoteWeight: BigInt(0),
						precommitWeight: BigInt(0),
					},
				],
				true,
			);
		});
	});

	describe('getNextHeightBFTParameters', () => {
		const createParam = () => ({
			prevoteThreshold: BigInt(68),
			precommitThreshold: BigInt(68),
			certificateThreshold: BigInt(68),
			validators: [
				{
					address: utils.getRandomBytes(20),
					bftWeight: BigInt(1),
					blsKey: utils.getRandomBytes(48),
				},
				{
					address: utils.getRandomBytes(20),
					bftWeight: BigInt(1),
					blsKey: utils.getRandomBytes(48),
				},
			],
			validatorsHash: utils.getRandomBytes(32),
		});
		const params20 = createParam();
		const params30 = createParam();
		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryDatabase());
			const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
			await votesStore.setWithSchema(utils.intToBuffer(20, 4), params20, bftParametersSchema);
			await votesStore.setWithSchema(utils.intToBuffer(30, 4), params30, bftParametersSchema);
		});

		it('should return the next height strictly higher than the input where BFT parameter exists', async () => {
			await expect(bftMethod.getNextHeightBFTParameters(stateStore, 20)).resolves.toEqual(30);
		});

		it('should throw when the next height strictly higher than the input BFT parameters does not exist', async () => {
			await expect(bftMethod.getNextHeightBFTParameters(stateStore, 30)).rejects.toThrow(
				BFTParameterNotFoundError,
			);
		});
	});

	describe('setBFTParameters', () => {
		const createParam = () => ({
			prevoteThreshold: BigInt(68),
			precommitThreshold: BigInt(68),
			certificateThreshold: BigInt(68),
			validators: [
				{
					address: utils.getRandomBytes(20),
					bftWeight: BigInt(1),
					blsKey: utils.getRandomBytes(48),
				},
				{
					address: utils.getRandomBytes(20),
					bftWeight: BigInt(1),
					blsKey: utils.getRandomBytes(48),
				},
			],
			validatorsHash: utils.getRandomBytes(32),
		});
		const generatorAddress = utils.getRandomBytes(20);
		const params20 = createParam();
		const params30 = createParam();

		beforeEach(async () => {
			validatorsMethod.getValidatorAccount.mockResolvedValue({ blsKey: utils.getRandomBytes(32) });
			stateStore = new StateStore(new InMemoryDatabase());
			const paramsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
			await paramsStore.setWithSchema(utils.intToBuffer(20, 4), params20, bftParametersSchema);
			await paramsStore.setWithSchema(utils.intToBuffer(30, 4), params30, bftParametersSchema);
			const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
			const addresses = [utils.getRandomBytes(20), utils.getRandomBytes(20)];
			await votesStore.setWithSchema(
				EMPTY_KEY,
				{
					maxHeightPrevoted: 10,
					maxHeightPrecommitted: 8,
					maxHeightCertified: 1,
					blockBFTInfos: [
						{
							height: 103,
							generatorAddress: addresses[0],
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
						{
							height: 102,
							generatorAddress,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
						{
							height: 101,
							generatorAddress: addresses[1],
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: BigInt(0),
							precommitWeight: BigInt(0),
						},
					],
					activeValidatorsVoteInfo: [
						{
							address: generatorAddress,
							minActiveHeight: 20,
							largestHeightPrecommit: 8,
						},
						{
							address: addresses[0],
							minActiveHeight: 0,
							largestHeightPrecommit: 8,
						},
						{
							address: addresses[1],
							minActiveHeight: 0,
							largestHeightPrecommit: 3,
						},
					],
				},
				bftVotesSchema,
			);
		});

		it('should throw when validators exceeds batch size', async () => {
			await expect(
				bftMethod.setBFTParameters(
					stateStore,
					BigInt(68),
					BigInt(68),
					new Array(bftMethod['_batchSize'] + 1).fill(0).map(() => ({
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(1),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					})),
				),
			).rejects.toThrow('Invalid validators size.');
		});

		it('should throw when less than 1/3 of aggregateBFTWeight for precommitThreshold is given', async () => {
			await expect(
				bftMethod.setBFTParameters(stateStore, BigInt(34), BigInt(68), [
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(50),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(50),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(3),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
				]),
			).rejects.toThrow('Invalid precommitThreshold input.');
		});

		it('should throw when precommitThreshold is given is greater than aggregateBFTWeight', async () => {
			await expect(
				bftMethod.setBFTParameters(stateStore, BigInt(104), BigInt(68), [
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(50),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(50),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(3),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
				]),
			).rejects.toThrow('Invalid precommitThreshold input.');
		});

		it('should throw when less than 1/3 of aggregateBFTWeight for certificateThreshold is given', async () => {
			await expect(
				bftMethod.setBFTParameters(stateStore, BigInt(68), BigInt(34), [
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(50),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(50),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(3),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
				]),
			).rejects.toThrow('Invalid certificateThreshold input.');
		});

		it('should throw when certificateThreshold is given is greater than aggregateBFTWeight', async () => {
			await expect(
				bftMethod.setBFTParameters(stateStore, BigInt(68), BigInt(104), [
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(50),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(50),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(3),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					},
				]),
			).rejects.toThrow('Invalid certificateThreshold input.');
		});

		describe('when setBFTParameters is successful', () => {
			const validators = [
				{
					address: generatorAddress,
					bftWeight: BigInt(50),
					blsKey: utils.getRandomBytes(48),
					generatorKey: utils.getRandomBytes(32),
				},
				{
					address: utils.getRandomBytes(20),
					bftWeight: BigInt(50),
					blsKey: utils.getRandomBytes(48),
					generatorKey: utils.getRandomBytes(32),
				},
				{
					address: utils.getRandomBytes(20),
					bftWeight: BigInt(3),
					blsKey: utils.getRandomBytes(48),
					generatorKey: utils.getRandomBytes(32),
				},
			];
			beforeEach(async () => {
				await bftMethod.setBFTParameters(stateStore, BigInt(68), BigInt(68), validators);
			});

			it('should store validators in order of the input', async () => {
				const paramsStore = stateStore.getStore(
					MODULE_STORE_PREFIX_BFT,
					STORE_PREFIX_BFT_PARAMETERS,
				);
				const params = await paramsStore.getWithSchema<BFTParameters>(
					utils.intToBuffer(104, 4),
					bftParametersSchema,
				);

				expect(params.validators).toHaveLength(3);
				expect(params.validators[0].address).toEqual(validators[0].address);
				expect(params.validators[1].address).toEqual(validators[1].address);
				expect(params.validators[2].address).toEqual(validators[2].address);
			});

			it('should store BFT parameters with height maxHeightPrevoted + 1 if blockBFTInfo does not exist', async () => {
				const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
				await votesStore.setWithSchema(
					EMPTY_KEY,
					{
						maxHeightPrevoted: 10,
						maxHeightPrecommitted: 8,
						maxHeightCertified: 1,
						blockBFTInfos: [],
						activeValidatorsVoteInfo: [
							{
								address: generatorAddress,
								minActiveHeight: 20,
								largestHeightPrecommit: 8,
							},
						],
					},
					bftVotesSchema,
				);

				await bftMethod.setBFTParameters(stateStore, BigInt(68), BigInt(68), [
					{
						address: generatorAddress,
						bftWeight: BigInt(50),
						generatorKey: utils.getRandomBytes(32),
						blsKey: utils.getRandomBytes(48),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(50),
						generatorKey: utils.getRandomBytes(32),
						blsKey: utils.getRandomBytes(48),
					},
					{
						address: utils.getRandomBytes(20),
						bftWeight: BigInt(3),
						generatorKey: utils.getRandomBytes(32),
						blsKey: utils.getRandomBytes(48),
					},
				]);

				const paramsStore = stateStore.getStore(
					MODULE_STORE_PREFIX_BFT,
					STORE_PREFIX_BFT_PARAMETERS,
				);
				await expect(
					paramsStore.getWithSchema<BFTParameters>(utils.intToBuffer(11, 4), bftParametersSchema),
				).toResolve();
			});

			it('should store BFT parameters with height latest blockBFTInfo + 1', async () => {
				const paramsStore = stateStore.getStore(
					MODULE_STORE_PREFIX_BFT,
					STORE_PREFIX_BFT_PARAMETERS,
				);
				await expect(
					paramsStore.getWithSchema<BFTParameters>(utils.intToBuffer(104, 4), bftParametersSchema),
				).toResolve();
			});

			it('should store new validators hash', async () => {
				const paramsStore = stateStore.getStore(
					MODULE_STORE_PREFIX_BFT,
					STORE_PREFIX_BFT_PARAMETERS,
				);
				const params = await paramsStore.getWithSchema<BFTParameters>(
					utils.intToBuffer(104, 4),
					bftParametersSchema,
				);
				expect(params.validatorsHash).not.toEqual(params30.validatorsHash);
			});

			it('should not update existing validators on bft votes', async () => {
				const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
				const voteState = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);
				expect(
					voteState.activeValidatorsVoteInfo.find(v => v.address.equals(generatorAddress)),
				).toEqual({
					address: generatorAddress,
					minActiveHeight: 20,
					largestHeightPrecommit: 8,
				});
			});

			it('should insert new validators into active validators with initial values', async () => {
				const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
				const voteState = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);
				expect(voteState.activeValidatorsVoteInfo).toHaveLength(3);
				expect(
					voteState.activeValidatorsVoteInfo.find(v => !v.address.equals(generatorAddress)),
				).toEqual(
					expect.objectContaining({
						minActiveHeight: 104,
						largestHeightPrecommit: 103,
					}),
				);
			});
		});

		describe('validatorsHash', () => {
			it('should sort validators ordered lexicographically by blsKey and include certificateThreshold', () => {
				const accounts = [
					{
						address: utils.getRandomBytes(20),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
						bftWeight: BigInt(20),
					},
					{
						address: utils.getRandomBytes(20),
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
						bftWeight: BigInt(20),
					},
				];
				validatorsMethod.getValidatorAccount.mockImplementation((_, address: Buffer) => {
					return { blsKey: accounts.find(k => k.address.equals(address))?.blsKey };
				});

				const validatorsHash = bftMethod['_computeValidatorsHash'](accounts, BigInt(99));

				const sortedAccounts = [...accounts];
				sortedAccounts.sort((a, b) => a.blsKey.compare(b.blsKey));
				expect(validatorsHash).toEqual(
					utils.hash(
						codec.encode(validatorsHashInputSchema, {
							activeValidators: [
								{
									blsKey: sortedAccounts[0].blsKey,
									bftWeight: sortedAccounts[0].bftWeight,
								},
								{
									blsKey: sortedAccounts[1].blsKey,
									bftWeight: sortedAccounts[1].bftWeight,
								},
							],
							certificateThreshold: BigInt(99),
						}),
					),
				);
			});
		});
	});
});
