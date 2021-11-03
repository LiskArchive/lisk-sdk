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
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { intToBuffer } from '@liskhq/lisk-cryptography';
import { GenesisConfig } from '../../../../src/types';
import { DPoSModule } from '../../../../src/modules/dpos_v2';
import * as forgerSelectionLessTHan103Scenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_less_than_103.json';
import * as forgerSelectionZeroStandbyScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_0_standby.json';
import * as forgerSelectionOneStandbyScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_exactly_1_standby.json';
import * as forgerSelectionTwoStandbyScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_exactly_2_standby.json';
import * as forgerSelectionMoreThan2StandByScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_more_than_2_standby.json';
import { BlockAfterExecuteContext } from '../../../../src/node/state_machine';
import { createBlockContext, createFakeBlockHeader } from '../../../../src/testing';
import {
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_SNAPSHOT,
} from '../../../../src/modules/dpos_v2/constants';
import { delegateStoreSchema, snapshotStoreSchema } from '../../../../src/modules/dpos_v2/schemas';
import { SnapshotStoreData, ValidatorsAPI } from '../../../../src/modules/dpos_v2/types';

describe('DPoS module', () => {
	const defaultConfigs = {
		factorSelfVotes: 10,
		maxLengthName: 20,
		maxNumberSentVotes: 10,
		maxNumberPendingUnlocks: 20,
		failSafeMissedBlocks: 50,
		failSafeInactiveWindow: 260000,
		punishmentWindow: 780000,
		roundLength: 103,
		bftThreshold: 68,
		minWeightStandby: (BigInt(1000) * BigInt(10 ** 8)).toString(),
		numberActiveDelegates: 101,
		numberStandbyDelegates: 2,
		tokenIDDPoS: {
			chainID: 0,
			localID: 0,
		},
	};
	describe('_createVoteWeightSnapshot', () => {
		let dpos: DPoSModule;

		beforeEach(async () => {
			dpos = new DPoSModule();
			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfigs,
			});
		});

		describe('when there are less number of delegates than active delegates', () => {
			const fixtures = forgerSelectionLessTHan103Scenario.testCases.input.voteWeights;

			let context: BlockAfterExecuteContext;
			let stateStore: StateStore;

			beforeEach(async () => {
				stateStore = new StateStore(new InMemoryKVStore());
				const delegateStore = stateStore.getStore(dpos.id, STORE_PREFIX_DELEGATE);
				for (const data of fixtures) {
					await delegateStore.setWithSchema(
						Buffer.from(data.address, 'hex'),
						{
							name: data.address,
							totalVotesReceived: BigInt(data.voteWeight),
							selfVotes: BigInt(data.voteWeight),
							lastGeneratedHeight: 0,
							isBanned: false,
							pomHeights: [],
							consecutiveMissedBlocks: 0,
						},
						delegateStoreSchema,
					);
				}
				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 1030 }),
				}).getBlockAfterExecuteContext();
			});

			it('should create a snapshot which include all delegates', async () => {
				await dpos['_createVoteWeightSnapshot'](context);

				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
					intToBuffer(11 + 2, 4),
					snapshotStoreSchema,
				);

				expect(snapshot.activeDelegates).toHaveLength(fixtures.length);
				expect(snapshot.delegateWeightSnapshot).toHaveLength(0);
			});
		});

		describe('when there are more number of delegates than active delegates, but no delegates above standby threshold', () => {
			const fixtures = forgerSelectionZeroStandbyScenario.testCases.input.voteWeights;

			let context: BlockAfterExecuteContext;
			let stateStore: StateStore;

			beforeEach(async () => {
				stateStore = new StateStore(new InMemoryKVStore());
				const delegateStore = stateStore.getStore(dpos.id, STORE_PREFIX_DELEGATE);
				for (const data of fixtures) {
					await delegateStore.setWithSchema(
						Buffer.from(data.address, 'hex'),
						{
							name: data.address,
							totalVotesReceived: BigInt(data.voteWeight),
							selfVotes: BigInt(data.voteWeight),
							lastGeneratedHeight: 0,
							isBanned: false,
							pomHeights: [],
							consecutiveMissedBlocks: 0,
						},
						delegateStoreSchema,
					);
				}
				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 1030 }),
				}).getBlockAfterExecuteContext();
				await dpos['_createVoteWeightSnapshot'](context);
			});

			it('should create a snapshot which include top 101 delegates as active delegates', async () => {
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
					intToBuffer(11 + 2, 4),
					snapshotStoreSchema,
				);

				expect(snapshot.activeDelegates).toHaveLength(defaultConfigs.numberActiveDelegates);
			});

			it('should create a snapshot which include all delegates in the snapshot', async () => {
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
					intToBuffer(11 + 2, 4),
					snapshotStoreSchema,
				);

				expect(snapshot.delegateWeightSnapshot).toHaveLength(2);
			});
		});

		describe('when there are more number of delegates than active delegates, but less delegates with standby threshold than required', () => {
			const fixtures = forgerSelectionOneStandbyScenario.testCases.input.voteWeights;

			let context: BlockAfterExecuteContext;
			let stateStore: StateStore;

			beforeEach(async () => {
				stateStore = new StateStore(new InMemoryKVStore());
				const delegateStore = stateStore.getStore(dpos.id, STORE_PREFIX_DELEGATE);
				for (const data of fixtures) {
					await delegateStore.setWithSchema(
						Buffer.from(data.address, 'hex'),
						{
							name: data.address,
							totalVotesReceived: BigInt(data.voteWeight),
							selfVotes: BigInt(data.voteWeight),
							lastGeneratedHeight: 0,
							isBanned: false,
							pomHeights: [],
							consecutiveMissedBlocks: 0,
						},
						delegateStoreSchema,
					);
				}
				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 1030 }),
				}).getBlockAfterExecuteContext();
				await dpos['_createVoteWeightSnapshot'](context);
			});

			it('should create a snapshot which include top 101 delegates as active delegates', async () => {
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
					intToBuffer(11 + 2, 4),
					snapshotStoreSchema,
				);

				expect(snapshot.activeDelegates).toHaveLength(defaultConfigs.numberActiveDelegates);
			});

			it('should create a snapshot which include all delegates in the snapshot', async () => {
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
					intToBuffer(11 + 2, 4),
					snapshotStoreSchema,
				);

				expect(snapshot.delegateWeightSnapshot).toHaveLength(2);
			});
		});

		describe('when there are more number of delegates than active delegates, and 2 delegates with standby threshold than required', () => {
			const fixtures = forgerSelectionTwoStandbyScenario.testCases.input.voteWeights;

			let context: BlockAfterExecuteContext;
			let stateStore: StateStore;

			beforeEach(async () => {
				stateStore = new StateStore(new InMemoryKVStore());
				const delegateStore = stateStore.getStore(dpos.id, STORE_PREFIX_DELEGATE);
				// set first delegate to cap the delegate weight
				await delegateStore.setWithSchema(
					Buffer.from(fixtures[0].address, 'hex'),
					{
						name: 'noselfvote',
						totalVotesReceived: BigInt(fixtures[0].voteWeight),
						selfVotes: BigInt(fixtures[0].voteWeight) / BigInt(1000),
						lastGeneratedHeight: 0,
						isBanned: false,
						pomHeights: [],
						consecutiveMissedBlocks: 0,
					},
					delegateStoreSchema,
				);
				// set second delegate punished
				await delegateStore.setWithSchema(
					Buffer.from(fixtures[1].address, 'hex'),
					{
						name: 'punished',
						totalVotesReceived: BigInt(fixtures[1].voteWeight),
						selfVotes: BigInt(fixtures[1].voteWeight),
						lastGeneratedHeight: 0,
						isBanned: false,
						pomHeights: [1000],
						consecutiveMissedBlocks: 0,
					},
					delegateStoreSchema,
				);
				for (const data of fixtures.slice(2)) {
					await delegateStore.setWithSchema(
						Buffer.from(data.address, 'hex'),
						{
							name: data.address,
							totalVotesReceived: BigInt(data.voteWeight),
							selfVotes: BigInt(data.voteWeight),
							lastGeneratedHeight: 0,
							isBanned: false,
							pomHeights: [],
							consecutiveMissedBlocks: 0,
						},
						delegateStoreSchema,
					);
				}
				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 1030 }),
				}).getBlockAfterExecuteContext();
				await dpos['_createVoteWeightSnapshot'](context);
			});

			it('should create a snapshot which include top 101 delegates as active delegates', async () => {
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
					intToBuffer(11 + 2, 4),
					snapshotStoreSchema,
				);

				expect(snapshot.activeDelegates).toHaveLength(defaultConfigs.numberActiveDelegates);
			});

			it('should cap the delegate weight', async () => {
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
					intToBuffer(11 + 2, 4),
					snapshotStoreSchema,
				);

				const capped = snapshot.delegateWeightSnapshot.find(s =>
					s.delegateAddress.equals(Buffer.from(fixtures[0].address, 'hex')),
				);

				// Remove banned, punished and no self-vote
				expect(capped?.delegateWeight).toEqual(
					(BigInt(fixtures[0].voteWeight) / BigInt(1000)) * BigInt(10),
				);
			});

			it('should set the delegate weight to zero when punished', async () => {
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
					intToBuffer(11 + 2, 4),
					snapshotStoreSchema,
				);

				const punished = snapshot.delegateWeightSnapshot.find(s =>
					s.delegateAddress.equals(Buffer.from(fixtures[1].address, 'hex')),
				);

				// Remove banned, punished and no self-vote
				expect(punished?.delegateWeight).toEqual(BigInt(0));
			});
		});

		describe('when there are more number of delegates than active delegates, and more delegates with standby threshold than required', () => {
			const fixtures = forgerSelectionMoreThan2StandByScenario.testCases.input.voteWeights;

			let context: BlockAfterExecuteContext;
			let stateStore: StateStore;

			beforeEach(async () => {
				stateStore = new StateStore(new InMemoryKVStore());
				const delegateStore = stateStore.getStore(dpos.id, STORE_PREFIX_DELEGATE);
				// set first delegate banned
				await delegateStore.setWithSchema(
					Buffer.from(fixtures[0].address, 'hex'),
					{
						name: 'banned',
						totalVotesReceived: BigInt(fixtures[0].voteWeight),
						selfVotes: BigInt(fixtures[0].voteWeight),
						lastGeneratedHeight: 0,
						isBanned: true,
						pomHeights: [],
						consecutiveMissedBlocks: 0,
					},
					delegateStoreSchema,
				);
				// set second delegate no self-vote
				await delegateStore.setWithSchema(
					Buffer.from(fixtures[1].address, 'hex'),
					{
						name: 'noselfvote',
						totalVotesReceived: BigInt(fixtures[1].voteWeight),
						selfVotes: BigInt(0),
						lastGeneratedHeight: 0,
						isBanned: false,
						pomHeights: [],
						consecutiveMissedBlocks: 0,
					},
					delegateStoreSchema,
				);
				// set third delegate punished
				await delegateStore.setWithSchema(
					Buffer.from(fixtures[2].address, 'hex'),
					{
						name: 'noselfvote',
						totalVotesReceived: BigInt(fixtures[2].voteWeight),
						selfVotes: BigInt(fixtures[2].voteWeight),
						lastGeneratedHeight: 0,
						isBanned: false,
						pomHeights: [1000],
						consecutiveMissedBlocks: 0,
					},
					delegateStoreSchema,
				);
				for (const data of fixtures.slice(3)) {
					await delegateStore.setWithSchema(
						Buffer.from(data.address, 'hex'),
						{
							name: data.address,
							totalVotesReceived: BigInt(data.voteWeight),
							selfVotes: BigInt(data.voteWeight),
							lastGeneratedHeight: 0,
							isBanned: false,
							pomHeights: [],
							consecutiveMissedBlocks: 0,
						},
						delegateStoreSchema,
					);
				}
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				await snapshotStore.set(intToBuffer(10, 4), Buffer.alloc(10));
				await snapshotStore.set(intToBuffer(11, 4), Buffer.alloc(10));
				await snapshotStore.set(intToBuffer(12, 4), Buffer.alloc(10));
				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 1030 }),
				}).getBlockAfterExecuteContext();
				await dpos['_createVoteWeightSnapshot'](context);
			});

			it('should create a snapshot which include top 101 delegates as active delegates', async () => {
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
					intToBuffer(11 + 2, 4),
					snapshotStoreSchema,
				);

				expect(snapshot.activeDelegates).toHaveLength(defaultConfigs.numberActiveDelegates);
			});

			it('should create a snapshot which include all delegates above standby threshold in the snapshot', async () => {
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const snapshot = await snapshotStore.getWithSchema<SnapshotStoreData>(
					intToBuffer(11 + 2, 4),
					snapshotStoreSchema,
				);

				const fixtureAboveThreshold = fixtures.filter(
					data => BigInt(data.voteWeight) >= BigInt(defaultConfigs.minWeightStandby),
				);

				// Remove banned, punished and no self-vote
				expect(snapshot.delegateWeightSnapshot).toHaveLength(
					fixtureAboveThreshold.length - 3 - defaultConfigs.numberActiveDelegates,
				);
			});

			it('should create a snapshot which remove the snapshot older than 3 rounds', async () => {
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);

				await expect(snapshotStore.has(intToBuffer(10, 4))).resolves.toBeFalse();
				await expect(snapshotStore.has(intToBuffer(11, 4))).resolves.toBeTrue();
				await expect(snapshotStore.has(intToBuffer(12, 4))).resolves.toBeTrue();
			});
		});
	});

	describe('_updateValidators', () => {
		let dpos: DPoSModule;

		beforeEach(async () => {
			dpos = new DPoSModule();
			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfigs,
			});
		});

		describe('given valid scenarios', () => {
			const scenarios = [
				forgerSelectionZeroStandbyScenario,
				forgerSelectionOneStandbyScenario,
				forgerSelectionTwoStandbyScenario,
				forgerSelectionLessTHan103Scenario,
				forgerSelectionMoreThan2StandByScenario,
			];
			const defaultRound = 5;

			for (const scenario of scenarios) {
				// eslint-disable-next-line jest/valid-title,no-loop-func
				describe(scenario.title, () => {
					it('should result in the expected forgers list', async () => {
						// Forger selection relies on vote weight to be sorted
						const delegates = [
							...scenario.testCases.input.voteWeights.map(d => ({
								delegateAddress: Buffer.from(d.address, 'hex'),
								delegateWeight: BigInt(d.voteWeight),
							})),
						];
						delegates.sort((a, b) => {
							const diff = b.delegateWeight - a.delegateWeight;
							if (diff > BigInt(0)) {
								return 1;
							}
							if (diff < BigInt(0)) {
								return -1;
							}
							return a.delegateAddress.compare(b.delegateAddress);
						});
						const stateStore = new StateStore(new InMemoryKVStore());
						const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
						const activeDelegates = delegates
							.slice(0, defaultConfigs.numberActiveDelegates)
							.map(d => d.delegateAddress);
						await snapshotStore.setWithSchema(
							intToBuffer(defaultRound, 4),
							{
								activeDelegates,
								delegateWeightSnapshot: delegates.slice(defaultConfigs.numberActiveDelegates),
							},
							snapshotStoreSchema,
						);
						const randomAPI = {
							getRandomBytes: jest
								.fn()
								.mockResolvedValueOnce(Buffer.from(scenario.testCases.input.randomSeed1, 'hex'))
								.mockResolvedValueOnce(Buffer.from(scenario.testCases.input.randomSeed2, 'hex')),
						};
						const bftAPI = {
							setBFTParameters: jest.fn(),
							getBFTParameters: jest.fn().mockResolvedValueOnce({
								precommitThreshold: defaultConfigs.bftThreshold,
								certificateThreshold: defaultConfigs.bftThreshold,
								validators: activeDelegates.map(d => ({
									address: d,
									bftWeight: BigInt(1),
								})),
							}),
						};
						const validatorAPI = {
							setGeneratorList: jest.fn(),
							setValidatorGeneratorKey: jest.fn(),
							registerValidatorKeys: jest.fn(),
						};
						const tokenAPI = {
							lock: jest.fn(),
						};

						dpos.addDependencies(randomAPI, bftAPI, validatorAPI, tokenAPI);
						const context = createBlockContext({
							header: createFakeBlockHeader({
								height: (defaultRound - 1) * defaultConfigs.roundLength,
							}),
							stateStore,
						}).getBlockAfterExecuteContext();

						await dpos['_updateValidators'](context);

						expect(validatorAPI.setGeneratorList).toHaveBeenCalledTimes(1);
						const forgersList = validatorAPI.setGeneratorList.mock.calls[0][1] as Buffer[];

						expect(forgersList.length).toBeGreaterThan(1);

						const forgersListAddresses = forgersList.sort((a, b) => a.compare(b));

						const sortedFixturesForgersBuffer = scenario.testCases.output.selectedForgers
							.map(aForger => Buffer.from(aForger, 'hex'))
							.sort((a, b) => a.compare(b));

						expect(forgersListAddresses).toEqual(sortedFixturesForgersBuffer);

						expect(bftAPI.getBFTParameters).toHaveBeenCalledTimes(1);
						expect(bftAPI.setBFTParameters).toHaveBeenCalledTimes(1);
					});
				});
			}
		});

		describe('when there are enough standby delegates', () => {
			const defaultRound = 123;
			let validatorAPI: ValidatorsAPI;

			const scenario = forgerSelectionMoreThan2StandByScenario;

			beforeEach(async () => {
				// Forger selection relies on vote weight to be sorted
				const delegates: { delegateAddress: Buffer; delegateWeight: bigint }[] = [
					...scenario.testCases.input.voteWeights.map(d => ({
						delegateAddress: Buffer.from(d.address, 'hex'),
						delegateWeight: BigInt(d.voteWeight),
					})),
				];
				delegates.sort((a, b) => {
					const diff = BigInt(b.delegateWeight) - BigInt(a.delegateWeight);
					if (diff > BigInt(0)) {
						return 1;
					}
					if (diff < BigInt(0)) {
						return -1;
					}
					return a.delegateAddress.compare(b.delegateAddress);
				});

				const stateStore = new StateStore(new InMemoryKVStore());
				const snapshotStore = stateStore.getStore(dpos.id, STORE_PREFIX_SNAPSHOT);
				const activeDelegates = delegates
					.slice(0, defaultConfigs.numberActiveDelegates)
					.map(d => d.delegateAddress);
				await snapshotStore.setWithSchema(
					intToBuffer(defaultRound, 4),
					{
						activeDelegates,
						delegateWeightSnapshot: delegates.slice(defaultConfigs.numberActiveDelegates),
					},
					snapshotStoreSchema,
				);
				const randomAPI = {
					getRandomBytes: jest
						.fn()
						.mockResolvedValueOnce(Buffer.from(scenario.testCases.input.randomSeed1, 'hex'))
						.mockResolvedValueOnce(Buffer.from(scenario.testCases.input.randomSeed2, 'hex')),
				};
				const bftAPI = {
					setBFTParameters: jest.fn(),
					getBFTParameters: jest.fn().mockResolvedValueOnce({
						precommitThreshold: defaultConfigs.bftThreshold,
						certificateThreshold: defaultConfigs.bftThreshold,
						validators: activeDelegates.map(d => ({
							address: d,
							bftWeight: BigInt(1),
						})),
					}),
				};
				validatorAPI = {
					setGeneratorList: jest.fn(),
					setValidatorGeneratorKey: jest.fn(),
					registerValidatorKeys: jest.fn(),
				};
				const tokenAPI = {
					lock: jest.fn(),
				};

				dpos.addDependencies(randomAPI, bftAPI, validatorAPI, tokenAPI);
				const context = createBlockContext({
					header: createFakeBlockHeader({
						height: (defaultRound - 1) * defaultConfigs.roundLength,
					}),
					stateStore,
				}).getBlockAfterExecuteContext();

				await dpos['_updateValidators'](context);
			});

			it('should have activeDelegates + standbyDelegates delegates in the forgers list', () => {
				expect(validatorAPI.setGeneratorList).toHaveBeenCalledTimes(1);
				const forgersList = (validatorAPI.setGeneratorList as jest.Mock).mock.calls[0][1];
				expect(forgersList).toHaveLength(defaultConfigs.roundLength);
			});

			it('should store selected stand by delegates in the forgers list', () => {
				const { selectedForgers } = scenario.testCases.output;
				const standbyDelegatesInFixture = [
					Buffer.from(selectedForgers[selectedForgers.length - 1], 'hex'),
					Buffer.from(selectedForgers[selectedForgers.length - 2], 'hex'),
				].sort((a, b) => a.compare(b));

				const forgersList = (validatorAPI.setGeneratorList as jest.Mock).mock
					.calls[0][1] as Buffer[];
				const standbyCandidatesAddresses = forgersList
					.filter(
						addr => standbyDelegatesInFixture.find(fixture => fixture.equals(addr)) !== undefined,
					)
					.sort((a, b) => a.compare(b));

				expect(standbyCandidatesAddresses).toHaveLength(2);
				expect(standbyCandidatesAddresses).toEqual(standbyDelegatesInFixture);
			});
		});
	});
});
