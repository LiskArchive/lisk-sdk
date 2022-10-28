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
/* eslint-disable no-loop-func */
import { BlockHeader, StateStore } from '@liskhq/lisk-chain';
import { utils, address } from '@liskhq/lisk-cryptography';
import { InMemoryDatabase } from '@liskhq/lisk-db';
import { BFTModule } from '../../../../src/engine/bft';
import {
	EMPTY_KEY,
	MODULE_STORE_PREFIX_BFT,
	STORE_PREFIX_BFT_PARAMETERS,
	STORE_PREFIX_BFT_VOTES,
} from '../../../../src/engine/bft/constants';
import { bftParametersSchema, BFTVotes, bftVotesSchema } from '../../../../src/engine/bft/schemas';
import * as scenario4DelegatesMissedSlots from './bft_processing/4_delegates_missed_slots.json';
import * as scenario4DelegatesSimple from './bft_processing/4_delegates_simple.json';
import * as scenario5DelegatesSwitchedCompletely from './bft_processing/5_delegates_switched_completely.json';
import * as scenario7DelegatesPartialSwitch from './bft_processing/7_delegates_partial_switch.json';
import * as scenario11DelegatesPartialSwitch from './bft_processing/11_delegates_partial_switch.json';
import { Validator } from '../../../../src/abi';

describe('BFT processing', () => {
	const bftScenarios = [
		scenario4DelegatesMissedSlots,
		scenario4DelegatesSimple,
		scenario5DelegatesSwitchedCompletely,
		scenario7DelegatesPartialSwitch,
		scenario11DelegatesPartialSwitch,
	];

	for (const scenario of bftScenarios) {
		// eslint-disable-next-line no-loop-func
		describe(`when running scenario "${scenario.handler}"`, () => {
			let bftModule: BFTModule;
			let db: InMemoryDatabase;
			let stateStore: StateStore;

			beforeAll(async () => {
				bftModule = new BFTModule();
				await bftModule.init(scenario.config.activeDelegates, 0, 10);
				db = new InMemoryDatabase();
				stateStore = new StateStore(db);

				const paramsStore = stateStore.getStore(
					MODULE_STORE_PREFIX_BFT,
					STORE_PREFIX_BFT_PARAMETERS,
				);
				const threshold = Math.floor((scenario.config.activeDelegates * 2) / 3) + 1;
				const validators: (Validator & { minHeightActive: number })[] = [];
				for (const testCase of scenario.testCases) {
					const generatorAddress = address.getAddressFromPublicKey(
						Buffer.from(testCase.input.blockHeader.generatorPublicKey, 'hex'),
					);
					if (validators.find(v => v.address.equals(generatorAddress)) === undefined) {
						validators.push({
							address: generatorAddress,
							minHeightActive: testCase.input.blockHeader.delegateMinHeightActive,
							bftWeight: BigInt(1),
							generatorKey: Buffer.from(testCase.input.blockHeader.generatorPublicKey, 'hex'),
							blsKey: utils.getRandomBytes(42),
						});
					}
				}
				await paramsStore.setWithSchema(
					utils.intToBuffer(1, 4),
					{
						prevoteThreshold: BigInt(threshold),
						precommitThreshold: BigInt(threshold),
						certificateThreshold: BigInt(threshold),
						validators,
						validatorsHash: utils.getRandomBytes(32),
					},
					bftParametersSchema,
				);
				const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
				await votesStore.setWithSchema(
					EMPTY_KEY,
					{
						maxHeightPrevoted: 0,
						maxHeightPrecommitted: 0,
						maxHeightCertified: 0,
						blockBFTInfos: [],
						activeValidatorsVoteInfo: validators.map(v => ({
							address: v.address,
							minActiveHeight: v.minHeightActive,
							largestHeightPrecommit: 0,
						})),
					},
					bftVotesSchema,
				);
			});

			for (const testCase of scenario.testCases) {
				it(`should have accurate information when ${testCase.input.delegateName} forge block at height = ${testCase.input.blockHeader.height}`, async () => {
					// Arrange
					const generatorAddress = address.getAddressFromPublicKey(
						Buffer.from(testCase.input.blockHeader.generatorPublicKey, 'hex'),
					);
					const header = new BlockHeader({
						version: 2,
						impliesMaxPrevote: false,
						aggregateCommit: {
							height: 0,
							aggregationBits: Buffer.alloc(0),
							certificateSignature: Buffer.alloc(0),
						},
						generatorAddress,
						height: testCase.input.blockHeader.height,
						maxHeightGenerated: testCase.input.blockHeader.maxHeightPreviouslyForged,
						maxHeightPrevoted: testCase.input.blockHeader.maxHeightPrevoted,
						previousBlockID: utils.getRandomBytes(32),
						timestamp: 0,
					});

					// Update minActiveHeight which is written in input block header
					const beforeVotesStore = stateStore.getStore(
						MODULE_STORE_PREFIX_BFT,
						STORE_PREFIX_BFT_VOTES,
					);
					const beforeVotes = await beforeVotesStore.getWithSchema<BFTVotes>(
						EMPTY_KEY,
						bftVotesSchema,
					);
					const validators = beforeVotes.activeValidatorsVoteInfo.map(v => {
						if (v.address.equals(generatorAddress)) {
							return {
								...v,
								minActiveHeight: testCase.input.blockHeader.delegateMinHeightActive,
							};
						}
						return v;
					});

					// Act
					await beforeVotesStore.setWithSchema(
						EMPTY_KEY,
						{
							...beforeVotes,
							activeValidatorsVoteInfo: validators,
						},
						bftVotesSchema,
					);

					await bftModule.beforeTransactionsExecute(stateStore, header);

					const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
					const result = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);

					// Assert
					expect(result.maxHeightPrevoted).toEqual(testCase.output.preVotedConfirmedHeight);
					expect(result.maxHeightPrecommitted).toEqual(testCase.output.finalizedHeight);
					const minHeight =
						testCase.input.blockHeader.height - bftModule['_maxLengthBlockBFTInfos'];
					for (const [heightStr, val] of Object.entries(testCase.output.preVotes)) {
						const height = Number(heightStr);
						const bftInfo = result.blockBFTInfos.find(b => b.height === height);
						if (height > minHeight) {
							expect(bftInfo?.prevoteWeight).toEqual(BigInt(val));
						} else {
							expect(bftInfo?.prevoteWeight).toBeUndefined();
						}
					}
					for (const [heightStr, val] of Object.entries(testCase.output.preCommits)) {
						const height = Number(heightStr);
						const bftInfo = result.blockBFTInfos.find(b => b.height === height);
						if (height > minHeight) {
							expect(bftInfo?.precommitWeight).toEqual(BigInt(val));
						} else {
							expect(bftInfo?.precommitWeight).toBeUndefined();
						}
					}
				});
			}
		});
	}
});
