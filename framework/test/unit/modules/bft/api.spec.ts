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
import { BIG_ENDIAN, getRandomBytes, hash, intToBuffer } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { BFTAPI } from '../../../../src/modules/bft/api';
import {
	EMPTY_KEY,
	MODULE_ID_BFT,
	STORE_PREFIX_BFT_PARAMETERS,
	STORE_PREFIX_BFT_VOTES,
} from '../../../../src/modules/bft/constants';
import { BFTParameterNotFoundError } from '../../../../src/modules/bft/errors';
import {
	BFTParameters,
	bftParametersSchema,
	BFTVotes,
	bftVotesSchema,
	validatorsHashInputSchema,
} from '../../../../src/modules/bft/schemas';
import { EventQueue } from '../../../../src/node/state_machine';
import { APIContext } from '../../../../src/node/state_machine/api_context';
import { createFakeBlockHeader } from '../../../../src/testing';

describe('BFT API', () => {
	const bftModuleID = MODULE_ID_BFT;

	let bftAPI: BFTAPI;
	let validatorsAPI: { getValidatorAccount: jest.Mock };
	let stateStore: StateStore;
	let apiContext: APIContext;

	beforeEach(() => {
		bftAPI = new BFTAPI(bftModuleID);
		validatorsAPI = { getValidatorAccount: jest.fn() };
		bftAPI.addDependencies(validatorsAPI);
		bftAPI.init(103);
	});

	describe('areHeadersContradicting', () => {
		it('should return false when blocks are identical', () => {
			const header1 = createFakeBlockHeader({
				generatorAddress: getRandomBytes(20),
			});
			expect(bftAPI.areHeadersContradicting(header1, header1)).toBeFalse();
		});

		it('should return true when blocks contradicting', () => {
			const generatorAddress = getRandomBytes(20);
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
			expect(bftAPI.areHeadersContradicting(header1, header2)).toBeTrue();
		});

		it('should return false when blocks are notcontradicting', () => {
			const header1 = createFakeBlockHeader({
				height: 10999,
				maxHeightPrevoted: 1099,
				generatorAddress: getRandomBytes(20),
			});
			const header2 = createFakeBlockHeader({
				height: 10999,
				maxHeightPrevoted: 1099,
				generatorAddress: getRandomBytes(20),
			});
			expect(bftAPI.areHeadersContradicting(header1, header2)).toBeFalse();
		});
	});

	describe('isHeaderContradictingChain', () => {
		const generatorAddress = getRandomBytes(20);

		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryKVStore());
			const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_VOTES);
			await votesStore.setWithSchema(
				EMPTY_KEY,
				{
					maxHeightPrevoted: 10,
					maxHeightPrecommited: 0,
					maxHeightCertified: 0,
					blockBFTInfos: [
						{
							height: 3,
							generatorAddress,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
						{
							height: 2,
							generatorAddress: getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
						{
							height: 1,
							generatorAddress: getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
					],
					activeValidatorsVoteInfo: [],
				},
				bftVotesSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
		});

		it('should return true when blockBFTInfos includes the block from the same generator and conflicting', async () => {
			await expect(
				bftAPI.isHeaderContradictingChain(
					apiContext,
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
				bftAPI.isHeaderContradictingChain(
					apiContext,
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
				bftAPI.isHeaderContradictingChain(
					apiContext,
					createFakeBlockHeader({
						height: 4,
						generatorAddress: getRandomBytes(20),
						maxHeightGenerated: 1,
						maxHeightPrevoted: 1,
					}),
				),
			).resolves.toBeFalse();
		});
	});

	describe('existBFTParameters', () => {
		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryKVStore());
			const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_PARAMETERS);
			await votesStore.setWithSchema(
				intToBuffer(20, 4, BIG_ENDIAN),
				{
					prevoteThreshold: BigInt(68),
					precommitThreshold: BigInt(68),
					certificateThreshold: BigInt(68),
					validators: [],
					validatorsHash: getRandomBytes(32),
				},
				bftParametersSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
		});

		it('should return true if the BFT parameter exist for the height', async () => {
			await expect(bftAPI.existBFTParameters(apiContext, 20)).resolves.toBeTrue();
		});

		it('should return false if the BFT parameter does not exist for the height', async () => {
			await expect(bftAPI.existBFTParameters(apiContext, 10)).resolves.toBeFalse();
		});
	});

	describe('getBFTParameters', () => {
		const createParam = () => ({
			prevoteThreshold: BigInt(68),
			precommitThreshold: BigInt(68),
			certificateThreshold: BigInt(68),
			validators: [
				{
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				},
				{
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				},
			],
			validatorsHash: getRandomBytes(32),
		});
		const params20 = createParam();
		const params30 = createParam();

		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryKVStore());
			const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_PARAMETERS);
			await votesStore.setWithSchema(intToBuffer(20, 4, BIG_ENDIAN), params20, bftParametersSchema);
			await votesStore.setWithSchema(intToBuffer(30, 4, BIG_ENDIAN), params30, bftParametersSchema);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
		});

		it('should return BFT parameters if it exists for the higher height', async () => {
			await expect(bftAPI.getBFTParameters(apiContext, 10)).resolves.toEqual(params20);
		});

		it('should return BFT parameters if it exists for the height', async () => {
			await expect(bftAPI.getBFTParameters(apiContext, 20)).resolves.toEqual(params20);
		});

		it('should throw if the BFT parameter does not exist for the height or higher', async () => {
			await expect(bftAPI.getBFTParameters(apiContext, 31)).rejects.toThrow(
				BFTParameterNotFoundError,
			);
		});
	});

	describe('getBFTHeights', () => {
		const generatorAddress = getRandomBytes(20);

		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryKVStore());
			const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_VOTES);
			await votesStore.setWithSchema(
				EMPTY_KEY,
				{
					maxHeightPrevoted: 10,
					maxHeightPrecommited: 8,
					maxHeightCertified: 1,
					blockBFTInfos: [
						{
							height: 3,
							generatorAddress,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
						{
							height: 2,
							generatorAddress: getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
						{
							height: 1,
							generatorAddress: getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
					],
					activeValidatorsVoteInfo: [],
				},
				bftVotesSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
		});

		it('should return current BFT heights', async () => {
			await expect(bftAPI.getBFTHeights(apiContext)).resolves.toEqual({
				maxHeightPrevoted: 10,
				maxHeightPrecommited: 8,
				maxHeightCertified: 1,
			});
		});
	});

	describe('impliesMaximalPrevotes', () => {
		const generatorAddress = getRandomBytes(20);

		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryKVStore());
			const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_VOTES);
			await votesStore.setWithSchema(
				EMPTY_KEY,
				{
					maxHeightPrevoted: 10,
					maxHeightPrecommited: 8,
					maxHeightCertified: 1,
					blockBFTInfos: [
						{
							height: 103,
							generatorAddress: getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
						{
							height: 102,
							generatorAddress,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
						{
							height: 101,
							generatorAddress: getRandomBytes(20),
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
					],
					activeValidatorsVoteInfo: [],
				},
				bftVotesSchema,
			);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
		});

		it('should return false if the header is not consecutive', async () => {
			await expect(
				bftAPI.impliesMaximalPrevotes(
					apiContext,
					createFakeBlockHeader({
						height: 105,
						generatorAddress: getRandomBytes(20),
						maxHeightGenerated: 0,
						maxHeightPrevoted: 0,
					}),
				),
			).resolves.toBeFalse();
		});

		it('should return false if maxHeightGenerated is greater than the height', async () => {
			await expect(
				bftAPI.impliesMaximalPrevotes(
					apiContext,
					createFakeBlockHeader({
						height: 104,
						generatorAddress: getRandomBytes(20),
						maxHeightGenerated: 120,
						maxHeightPrevoted: 0,
					}),
				),
			).resolves.toBeFalse();
		});

		it('should return true if blockBFTInfo does not contain the information', async () => {
			await expect(
				bftAPI.impliesMaximalPrevotes(
					apiContext,
					createFakeBlockHeader({
						height: 104,
						generatorAddress: getRandomBytes(20),
						maxHeightGenerated: 1,
						maxHeightPrevoted: 0,
					}),
				),
			).resolves.toBeTrue();
		});

		it('should return false if the last generated height is generated by different address', async () => {
			await expect(
				bftAPI.impliesMaximalPrevotes(
					apiContext,
					createFakeBlockHeader({
						height: 104,
						generatorAddress: getRandomBytes(20),
						maxHeightGenerated: 101,
						maxHeightPrevoted: 0,
					}),
				),
			).resolves.toBeFalse();
		});

		it('should return true when it is consecutive valid block header', async () => {
			await expect(
				bftAPI.impliesMaximalPrevotes(
					apiContext,
					createFakeBlockHeader({
						height: 104,
						generatorAddress,
						maxHeightGenerated: 102,
						maxHeightPrevoted: 0,
					}),
				),
			).resolves.toBeTrue();
		});
	});

	describe('getNextHeightBFTParameters', () => {
		const createParam = () => ({
			prevoteThreshold: BigInt(68),
			precommitThreshold: BigInt(68),
			certificateThreshold: BigInt(68),
			validators: [
				{
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				},
				{
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				},
			],
			validatorsHash: getRandomBytes(32),
		});
		const params20 = createParam();
		const params30 = createParam();
		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryKVStore());
			const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_PARAMETERS);
			await votesStore.setWithSchema(intToBuffer(20, 4, BIG_ENDIAN), params20, bftParametersSchema);
			await votesStore.setWithSchema(intToBuffer(30, 4, BIG_ENDIAN), params30, bftParametersSchema);
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
		});

		it('should return the next height strictly higher than the input where BFT parameter exists', async () => {
			await expect(bftAPI.getNextHeightBFTParameters(apiContext, 20)).resolves.toEqual(30);
		});

		it('should throw when the next height strictly higher than the input BFT parameters does not exist', async () => {
			await expect(bftAPI.getNextHeightBFTParameters(apiContext, 30)).rejects.toThrow(
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
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				},
				{
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				},
			],
			validatorsHash: getRandomBytes(32),
		});
		const generatorAddress = getRandomBytes(20);
		const params20 = createParam();
		const params30 = createParam();

		beforeEach(async () => {
			validatorsAPI.getValidatorAccount.mockResolvedValue({ blsKey: getRandomBytes(32) });
			stateStore = new StateStore(new InMemoryKVStore());
			const paramsStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_PARAMETERS);
			await paramsStore.setWithSchema(
				intToBuffer(20, 4, BIG_ENDIAN),
				params20,
				bftParametersSchema,
			);
			await paramsStore.setWithSchema(
				intToBuffer(30, 4, BIG_ENDIAN),
				params30,
				bftParametersSchema,
			);
			const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_VOTES);
			const addresses = [getRandomBytes(20), getRandomBytes(20)];
			await votesStore.setWithSchema(
				EMPTY_KEY,
				{
					maxHeightPrevoted: 10,
					maxHeightPrecommited: 8,
					maxHeightCertified: 1,
					blockBFTInfos: [
						{
							height: 103,
							generatorAddress: addresses[0],
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
						{
							height: 102,
							generatorAddress,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
						{
							height: 101,
							generatorAddress: addresses[1],
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
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
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
		});

		it('should throw when validators exceeds batch size', async () => {
			await expect(
				bftAPI.setBFTParameters(
					apiContext,
					BigInt(68),
					BigInt(68),
					new Array(bftAPI['_batchSize'] + 1).fill(0).map(() => ({
						address: getRandomBytes(20),
						bftWeight: BigInt(1),
					})),
				),
			).rejects.toThrow('Invalid validators size.');
		});

		it('should throw when any BFT weight is less or equal to zero', async () => {
			await expect(
				bftAPI.setBFTParameters(apiContext, BigInt(68), BigInt(68), [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(103),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(0),
					},
				]),
			).rejects.toThrow('Invalid BFT weight.');
		});

		it('should throw when less than 1/3 of aggregateBFTWeight for precommitThreshold is given', async () => {
			await expect(
				bftAPI.setBFTParameters(apiContext, BigInt(34), BigInt(68), [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(3),
					},
				]),
			).rejects.toThrow('Invalid precommitThreshold input.');
		});

		it('should throw when precommitThreshold is given is greater than aggregateBFTWeight', async () => {
			await expect(
				bftAPI.setBFTParameters(apiContext, BigInt(104), BigInt(68), [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(3),
					},
				]),
			).rejects.toThrow('Invalid precommitThreshold input.');
		});

		it('should throw when less than 1/3 of aggregateBFTWeight for certificateThreshold is given', async () => {
			await expect(
				bftAPI.setBFTParameters(apiContext, BigInt(68), BigInt(34), [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(3),
					},
				]),
			).rejects.toThrow('Invalid certificateThreshold input.');
		});

		it('should throw when certificateThreshold is given is greater than aggregateBFTWeight', async () => {
			await expect(
				bftAPI.setBFTParameters(apiContext, BigInt(68), BigInt(104), [
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(3),
					},
				]),
			).rejects.toThrow('Invalid certificateThreshold input.');
		});

		describe('when setBFTParameters is successful', () => {
			beforeEach(async () => {
				await bftAPI.setBFTParameters(apiContext, BigInt(68), BigInt(68), [
					{
						address: generatorAddress,
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(3),
					},
				]);
			});

			it('should store validators ordered lexicographically by address', async () => {
				const paramsStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_PARAMETERS);
				const params = await paramsStore.getWithSchema<BFTParameters>(
					intToBuffer(104, 4, BIG_ENDIAN),
					bftParametersSchema,
				);

				expect(params.validators).toHaveLength(3);
				// -1 will be asc
				expect(params.validators[0].address.compare(params.validators[1].address)).toEqual(-1);
			});

			it('should store BFT parameters with height maxHeightPrevoted + 1 if blockBFTInfo does not exist', async () => {
				const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_VOTES);
				await votesStore.setWithSchema(
					EMPTY_KEY,
					{
						maxHeightPrevoted: 10,
						maxHeightPrecommited: 8,
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

				await bftAPI.setBFTParameters(apiContext, BigInt(68), BigInt(68), [
					{
						address: generatorAddress,
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(50),
					},
					{
						address: getRandomBytes(20),
						bftWeight: BigInt(3),
					},
				]);

				const paramsStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_PARAMETERS);
				await expect(
					paramsStore.getWithSchema<BFTParameters>(
						intToBuffer(11, 4, BIG_ENDIAN),
						bftParametersSchema,
					),
				).toResolve();
			});

			it('should store BFT parameters with height latest blockBFTInfo + 1', async () => {
				const paramsStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_PARAMETERS);
				await expect(
					paramsStore.getWithSchema<BFTParameters>(
						intToBuffer(104, 4, BIG_ENDIAN),
						bftParametersSchema,
					),
				).toResolve();
			});

			it('should store new validators hash', async () => {
				const paramsStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_PARAMETERS);
				const params = await paramsStore.getWithSchema<BFTParameters>(
					intToBuffer(104, 4, BIG_ENDIAN),
					bftParametersSchema,
				);
				expect(params.validatorsHash).not.toEqual(params30.validatorsHash);
			});

			it('should not update existing validators on bft votes', async () => {
				const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_VOTES);
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
				const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_VOTES);
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
			it('should sort validators ordered lexicographically by blsKey and include certificateThreshold', async () => {
				const accounts = [
					{
						address: getRandomBytes(20),
						blsKey: getRandomBytes(32),
						bftWeight: BigInt(20),
					},
					{
						address: getRandomBytes(20),
						blsKey: getRandomBytes(32),
						bftWeight: BigInt(20),
					},
				];
				validatorsAPI.getValidatorAccount.mockImplementation((_, address: Buffer) => {
					return { blsKey: accounts.find(k => k.address.equals(address))?.blsKey };
				});

				const validatorsHash = await bftAPI['_computeValidatorsHash'](
					apiContext,
					accounts,
					BigInt(99),
				);

				const sortedAccounts = [...accounts];
				sortedAccounts.sort((a, b) => a.blsKey.compare(b.blsKey));
				expect(validatorsHash).toEqual(
					hash(
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

	describe('getValidators', () => {
		const createParam = () => ({
			prevoteThreshold: BigInt(68),
			precommitThreshold: BigInt(68),
			certificateThreshold: BigInt(68),
			validators: [
				{
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				},
				{
					address: getRandomBytes(20),
					bftWeight: BigInt(1),
				},
			],
			validatorsHash: getRandomBytes(32),
		});
		const params20 = createParam();
		const params30 = createParam();
		beforeEach(async () => {
			stateStore = new StateStore(new InMemoryKVStore());
			const votesStore = stateStore.getStore(bftAPI['moduleID'], STORE_PREFIX_BFT_PARAMETERS);
			await votesStore.setWithSchema(intToBuffer(20, 4, BIG_ENDIAN), params20, bftParametersSchema);
			await votesStore.setWithSchema(intToBuffer(30, 4, BIG_ENDIAN), params30, bftParametersSchema);
		});

		it('should current active validators', async () => {
			apiContext = new APIContext({ stateStore, eventQueue: new EventQueue() });
			await expect(bftAPI.getValidators(apiContext)).resolves.toEqual(params30.validators);
		});
	});
});
