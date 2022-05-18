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

import { BlockAssets, StateStore } from '@liskhq/lisk-chain';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { getRandomBytes, intToBuffer } from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';
import { codec } from '@liskhq/lisk-codec';
import { GenesisConfig } from '../../../../src/types';
import { DPoSModule } from '../../../../src/modules/dpos_v2';
import * as forgerSelectionLessTHan103Scenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_less_than_103.json';
import * as forgerSelectionZeroStandbyScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_0_standby.json';
import * as forgerSelectionOneStandbyScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_exactly_1_standby.json';
import * as forgerSelectionTwoStandbyScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_exactly_2_standby.json';
import * as forgerSelectionMoreThan2StandByScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_more_than_2_standby.json';
import { BlockAfterExecuteContext } from '../../../../src/node/state_machine';
import {
	createBlockContext,
	createFakeBlockHeader,
	createGenesisBlockContext,
} from '../../../../src/testing';
import {
	MODULE_ID_DPOS,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_GENESIS_DATA,
	STORE_PREFIX_NAME,
	STORE_PREFIX_PREVIOUS_TIMESTAMP,
	STORE_PREFIX_SNAPSHOT,
	STORE_PREFIX_VOTER,
} from '../../../../src/modules/dpos_v2/constants';
import {
	delegateStoreSchema,
	genesisDataStoreSchema,
	genesisStoreSchema,
	previousTimestampStoreSchema,
	snapshotStoreSchema,
	voterStoreSchema,
} from '../../../../src/modules/dpos_v2/schemas';
import {
	DelegateAccount,
	GenesisData,
	PreviousTimestampData,
	SnapshotStoreData,
	ValidatorsAPI,
} from '../../../../src/modules/dpos_v2/types';
import { GenesisBlockExecuteContext, SubStore } from '../../../../src/node/state_machine/types';
import { invalidAssets, validAsset, validators } from './genesis_block_test_data';

describe('DPoS module', () => {
	const EMPTY_KEY = Buffer.alloc(0);
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
		tokenIDDPoS: '0000000000000000',
	};

	describe('init', () => {
		let dpos: DPoSModule;
		beforeEach(() => {
			dpos = new DPoSModule();
		});

		it('should initialize config with default value when module config is empty', async () => {
			await expect(
				dpos.init({ genesisConfig: {} as any, moduleConfig: {}, generatorConfig: {} }),
			).toResolve();

			expect(dpos['_moduleConfig']).toEqual({
				...defaultConfigs,
				minWeightStandby: BigInt(defaultConfigs.minWeightStandby),
				tokenIDDPoS: Buffer.from(defaultConfigs.tokenIDDPoS, 'hex'),
			});
		});

		it('should initialize config with given value', async () => {
			await expect(
				dpos.init({
					genesisConfig: {} as any,
					moduleConfig: { ...defaultConfigs, maxLengthName: 50 },
					generatorConfig: {},
				}),
			).toResolve();

			expect(dpos['_moduleConfig'].maxLengthName).toEqual(50);
		});
	});

	describe('initGenesisState', () => {
		let dpos: DPoSModule;
		let stateStore: StateStore;

		beforeEach(async () => {
			dpos = new DPoSModule();
			stateStore = new StateStore(new InMemoryKVStore());
			const randomAPI = {
				getRandomBytes: jest.fn(),
			};
			const bftAPI = {
				setBFTParameters: jest.fn(),
				getBFTParameters: jest.fn(),
				areHeadersContradicting: jest.fn(),
				getBFTHeights: jest.fn(),
			};
			const validatorAPI = {
				setGeneratorList: jest.fn(),
				setValidatorGeneratorKey: jest.fn(),
				registerValidatorKeys: jest.fn().mockResolvedValue(true),
				getValidatorAccount: jest.fn(),
				getGeneratorsBetweenTimestamps: jest.fn(),
				getGeneratorAtTimestamp: jest.fn(),
			};
			const tokenAPI = {
				lock: jest.fn(),
				unlock: jest.fn(),
				getAvailableBalance: jest.fn(),
				getMinRemainingBalance: jest.fn(),
				transfer: jest.fn(),
				getLockedAmount: jest.fn().mockResolvedValue(BigInt(101000000000)),
			};
			dpos.addDependencies(randomAPI, bftAPI, validatorAPI, tokenAPI);

			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfigs,
			});
		});

		describe.each(invalidAssets)('%p', (_, data, errString) => {
			it('should throw error when asset is invalid', async () => {
				// eslint-disable-next-line @typescript-eslint/ban-types
				const assetBytes = codec.encode(genesisStoreSchema, data as object);
				const context = createGenesisBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 12345 }),
					assets: new BlockAssets([{ moduleID: dpos.id, data: assetBytes }]),
				}).createInitGenesisStateContext();
				jest.spyOn(dpos, 'finalizeGenesisState');

				await expect(dpos.initGenesisState(context)).rejects.toThrow(errString as string);
				expect(dpos.finalizeGenesisState).not.toHaveBeenCalled();
			});
		});

		describe('when the genesis height is zero', () => {
			it('should throw error if snapshot exist', async () => {
				const modified = {
					...validAsset,
					snapshots: [
						{
							roundNumber: 0,
							activeDelegates: validators.slice(0, 101).map(v => v.address),
							delegateWeightSnapshot: validators.slice(101).map(v => ({
								delegateAddress: v.address,
								delegateWeight: BigInt(100000000000),
							})),
						},
					],
				};
				const assetBytes = codec.encode(genesisStoreSchema, modified);
				const context = createGenesisBlockContext({
					stateStore,
					assets: new BlockAssets([{ moduleID: dpos.id, data: assetBytes }]),
				}).createInitGenesisStateContext();
				await dpos.initGenesisState(context);
				await expect(dpos.finalizeGenesisState(context)).rejects.toThrow(
					'When genensis height is zero, there should not be a snapshot',
				);
			});
		});

		describe('when the genesis height is non-zero', () => {
			it('should throw error if snapshot does not exist', async () => {
				const assetBytes = codec.encode(genesisStoreSchema, validAsset);
				const context = createGenesisBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 12345 }),
					assets: new BlockAssets([{ moduleID: dpos.id, data: assetBytes }]),
				}).createInitGenesisStateContext();
				await dpos.initGenesisState(context);
				await expect(dpos.finalizeGenesisState(context)).rejects.toThrow(
					'When genesis height is non-zero, snapshot is required',
				);
			});
		});

		describe('when the genesis asset is valid', () => {
			let context: GenesisBlockExecuteContext;

			beforeEach(() => {
				const assetBytes = codec.encode(genesisStoreSchema, validAsset);
				context = createGenesisBlockContext({
					stateStore,
					assets: new BlockAssets([{ moduleID: dpos.id, data: assetBytes }]),
				}).createInitGenesisStateContext();
			});

			it('should store self vote and received votes', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();
				await expect(dpos.finalizeGenesisState(context)).toResolve();

				const delegateStore = stateStore.getStore(dpos.id, STORE_PREFIX_DELEGATE);
				await expect(
					delegateStore.getWithSchema(validAsset.voters[0].address, delegateStoreSchema),
				).resolves.toEqual({
					name: expect.any(String),
					consecutiveMissedBlocks: 0,
					isBanned: false,
					lastGeneratedHeight: 0,
					pomHeights: [],
					selfVotes: BigInt(100000000000),
					totalVotesReceived: BigInt(200000000000),
				});
			});

			it('should store all the votes', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();
				const voterStore = stateStore.getStore(dpos.id, STORE_PREFIX_VOTER);
				expect.assertions(validAsset.voters.length + 1);
				for (const voter of validAsset.voters) {
					await expect(voterStore.getWithSchema(voter.address, voterStoreSchema)).resolves.toEqual({
						sentVotes: voter.sentVotes,
						pendingUnlocks: voter.pendingUnlocks,
					});
				}
			});

			it('should store all the delegates', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();
				const usernameStore = stateStore.getStore(dpos.id, STORE_PREFIX_NAME);
				const allNames = await usernameStore.iterate({
					start: Buffer.from([0]),
					end: Buffer.from([255]),
				});
				expect(allNames).toHaveLength(validAsset.validators.length);

				const delegateStore = context.getStore(dpos.id, STORE_PREFIX_DELEGATE);
				const allDelegates = await delegateStore.iterate({
					start: Buffer.alloc(20, 0),
					end: Buffer.alloc(20, 255),
				});
				expect(allDelegates).toHaveLength(validAsset.validators.length);
			});

			it('should store previous timestamp', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();

				const previousTimestampStore = context.getStore(dpos.id, STORE_PREFIX_PREVIOUS_TIMESTAMP);
				await expect(
					previousTimestampStore.getWithSchema(EMPTY_KEY, previousTimestampStoreSchema),
				).resolves.toEqual({
					timestamp: context.header.timestamp,
				});
			});

			it('should store genesis data', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();

				const genesisDataStore = context.getStore(dpos.id, STORE_PREFIX_GENESIS_DATA);
				await expect(
					genesisDataStore.getWithSchema(EMPTY_KEY, genesisDataStoreSchema),
				).resolves.toEqual({
					height: context.header.height,
					initRounds: validAsset.genesisData.initRounds,
					initDelegates: validAsset.genesisData.initDelegates,
				});
			});

			it('should register all the validators', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();
				await expect(dpos.finalizeGenesisState(context)).toResolve();

				expect(dpos['_validatorsAPI'].setGeneratorList).toHaveBeenCalledWith(
					expect.anything(),
					validAsset.genesisData.initDelegates,
				);
			});

			it('should register all active delegates as BFT validators', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();
				await expect(dpos.finalizeGenesisState(context)).toResolve();
				expect(dpos['_bftAPI'].setBFTParameters).toHaveBeenCalledWith(
					expect.anything(),
					BigInt(68),
					BigInt(68),
					validAsset.genesisData.initDelegates.map(d => ({
						bftWeight: BigInt(1),
						address: d,
					})),
				);
			});

			it('should fail if registerValidatorKeys return false', async () => {
				(dpos['_validatorsAPI'].registerValidatorKeys as jest.Mock).mockResolvedValue(false);

				await expect(dpos.initGenesisState(context)).toResolve();
				await expect(dpos.finalizeGenesisState(context)).rejects.toThrow('Invalid validator key');
			});

			it('should fail if getLockedAmount return different value', async () => {
				(dpos['_tokenAPI'].getLockedAmount as jest.Mock).mockResolvedValue(BigInt(0));

				await expect(dpos.initGenesisState(context)).toResolve();
				await expect(dpos.finalizeGenesisState(context)).rejects.toThrow(
					'Voted amount is not locked',
				);
			});
		});
	});

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
							getBFTHeights: jest.fn(),
							areHeadersContradicting: jest.fn(),
						};
						const validatorAPI = {
							setGeneratorList: jest.fn(),
							setValidatorGeneratorKey: jest.fn(),
							registerValidatorKeys: jest.fn(),
							getValidatorAccount: jest.fn(),
							getGeneratorsBetweenTimestamps: jest.fn(),
							getGeneratorAtTimestamp: jest.fn(),
						};
						const tokenAPI = {
							lock: jest.fn(),
							unlock: jest.fn(),
							getAvailableBalance: jest.fn(),
							getMinRemainingBalance: jest.fn(),
							transfer: jest.fn(),
							getLockedAmount: jest.fn(),
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
					areHeadersContradicting: jest.fn(),
					getBFTHeights: jest.fn(),
				};
				validatorAPI = {
					setGeneratorList: jest.fn(),
					setValidatorGeneratorKey: jest.fn(),
					registerValidatorKeys: jest.fn(),
					getValidatorAccount: jest.fn(),
					getGeneratorsBetweenTimestamps: jest.fn(),
					getGeneratorAtTimestamp: jest.fn(),
				};
				const tokenAPI = {
					lock: jest.fn(),
					unlock: jest.fn(),
					getAvailableBalance: jest.fn(),
					getMinRemainingBalance: jest.fn(),
					transfer: jest.fn(),
					getLockedAmount: jest.fn(),
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

	describe('_updateProductivity', () => {
		const randomAPI: any = {};
		const bftAPI: any = {};
		const tokenAPI: any = {};

		let validatorsAPI: any;
		let stateStore: StateStore;
		let delegateData: DelegateAccount[];
		let delegateAddresses: Buffer[];
		let previousTimestampStore: SubStore;
		let delegateStore: SubStore;
		let dpos: DPoSModule;

		beforeEach(async () => {
			dpos = new DPoSModule();
			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfigs,
			});

			stateStore = new StateStore(new InMemoryKVStore());

			validatorsAPI = {
				getGeneratorsBetweenTimestamps: jest.fn(),
				getGeneratorAtTimestamp: jest.fn(),
			};

			dpos.addDependencies(randomAPI, bftAPI, validatorsAPI, tokenAPI);

			delegateData = Array(103)
				.fill({})
				.map((_, index) => ({
					name: `delegate${index}`,
					totalVotesReceived: BigInt(0),
					selfVotes: BigInt(0),
					lastGeneratedHeight: 0,
					isBanned: false,
					pomHeights: [],
					consecutiveMissedBlocks: 0,
				}));
			delegateAddresses = Array.from({ length: 103 }, _ => getRandomBytes(20));

			previousTimestampStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_PREVIOUS_TIMESTAMP);
			delegateStore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);

			for (let i = 0; i < 103; i += 1) {
				await delegateStore.setWithSchema(
					delegateAddresses[i],
					delegateData[i],
					delegateStoreSchema,
				);
			}
		});
		describe('When only 1 delegate forged since last block', () => {
			it('should increment "consecutiveMissedBlocks" for every forgers except forging delegate', async () => {
				const generatorAddress = delegateAddresses[delegateAddresses.length - 1];
				const previousTimestamp = 9260;
				const currentTimestamp = 10290;
				const lastForgedHeight = 926;
				const nextForgedHeight = lastForgedHeight + 1;

				const context = createBlockContext({
					header: {
						height: nextForgedHeight,
						generatorAddress,
						timestamp: currentTimestamp,
					} as any,
					stateStore,
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				const missedBlocks: Record<string, number> = {};
				// Make every delegate miss its block-slot except start and end slots
				for (let i = 0; i < 102; i += 1) {
					missedBlocks[delegateAddresses[i].toString('binary')] = 1;
				}

				when(validatorsAPI.getGeneratorsBetweenTimestamps)
					.calledWith(expect.anything(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), currentTimestamp)
					.mockReturnValue(generatorAddress);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), previousTimestamp)
					.mockReturnValue(generatorAddress);

				await dpos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(delegateAddresses.length + 1);
				for (const delegateAddress of delegateAddresses) {
					const currentDelegate = await delegateStore.getWithSchema<DelegateAccount>(
						delegateAddress,
						delegateStoreSchema,
					);
					if (delegateAddress.equals(generatorAddress)) {
						expect(currentDelegate.consecutiveMissedBlocks).toBe(0);
						expect(currentDelegate.lastGeneratedHeight).toBe(nextForgedHeight);
					} else {
						expect(currentDelegate.consecutiveMissedBlocks).toBe(1);
					}
				}
			});
		});

		describe('When only 2 delegate missed a block since last block', () => {
			it('should increment "consecutiveMissedBlocks" only for forgers who missed a block', async () => {
				const lastForgerAddress = delegateAddresses[delegateAddresses.length - 4];
				const generatorAddress = delegateAddresses[delegateAddresses.length - 1];
				const missedForgers = [
					delegateAddresses[delegateAddresses.length - 2],
					delegateAddresses[delegateAddresses.length - 3],
				];
				const previousTimestamp = 10260;
				const currentTimestamp = 10290;
				const lastForgedHeight = 926;
				const nextForgedHeight = lastForgedHeight + 1;

				const context = createBlockContext({
					header: {
						height: nextForgedHeight,
						generatorAddress,
						timestamp: currentTimestamp,
					} as any,
					stateStore,
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				const missedBlocks: Record<string, number> = {};
				for (let i = 1; i < missedForgers.length + 1; i += 1) {
					missedBlocks[missedForgers[2 - i].toString('binary')] = 1;
				}

				when(validatorsAPI.getGeneratorsBetweenTimestamps)
					.calledWith(expect.anything(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), currentTimestamp)
					.mockReturnValue(generatorAddress);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), previousTimestamp)
					.mockReturnValue(lastForgerAddress);

				await dpos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(delegateAddresses.length);
				for (const delegateAddress of delegateAddresses) {
					const currentDelegate = await delegateStore.getWithSchema<DelegateAccount>(
						delegateAddress,
						delegateStoreSchema,
					);
					if (missedForgers.some(missedForger => missedForger.equals(delegateAddress))) {
						expect(currentDelegate.consecutiveMissedBlocks).toBe(1);
					} else {
						expect(currentDelegate.consecutiveMissedBlocks).toBe(0);
					}
				}
			});
		});

		describe('When delegate missed more than 1 blocks since last block', () => {
			it('should increment "consecutiveMissedBlocks"  for the number of blocks that delegate missed', async () => {
				const generatorIndex = delegateAddresses.length - 1;
				const generatorAddress = delegateAddresses[generatorIndex];
				const lastForgerAddress = delegateAddresses[generatorIndex - 6];
				const missedMoreThan1Block = delegateAddresses.slice(generatorIndex - 5, generatorIndex);
				const previousTimestamp = 9200;
				const currentTimestamp = 10290;
				const lastForgedHeight = 926;
				const nextForgedHeight = lastForgedHeight + 1;

				const context = createBlockContext({
					header: {
						height: nextForgedHeight,
						generatorAddress,
						timestamp: currentTimestamp,
					} as any,
					stateStore,
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				const missedBlocks: Record<string, number> = {};
				for (const delegateAddress of delegateAddresses) {
					missedBlocks[delegateAddress.toString('binary')] = 1;
				}
				for (const delegateAddress of missedMoreThan1Block) {
					missedBlocks[delegateAddress.toString('binary')] += 1;
				}

				when(validatorsAPI.getGeneratorsBetweenTimestamps)
					.calledWith(expect.anything(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), currentTimestamp)
					.mockReturnValue(generatorAddress);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), previousTimestamp)
					.mockReturnValue(lastForgerAddress);

				await dpos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(delegateAddresses.length);
				for (const delegateAddress of delegateAddresses) {
					const currentDelegate = await delegateStore.getWithSchema<DelegateAccount>(
						delegateAddress,
						delegateStoreSchema,
					);
					if (missedMoreThan1Block.some(missedForger => missedForger.equals(delegateAddress))) {
						expect(currentDelegate.consecutiveMissedBlocks).toBe(2);
					} else if (delegateAddress.equals(generatorAddress)) {
						expect(currentDelegate.consecutiveMissedBlocks).toBe(0);
					} else {
						expect(currentDelegate.consecutiveMissedBlocks).toBe(1);
					}
				}
			});
		});

		describe('When all delegates successfully forges a block', () => {
			it('must NOT update "consecutiveMissedBlocks" for anyone', async () => {
				const generatorIndex = delegateAddresses.length - 1;
				const generatorAddress = delegateAddresses[generatorIndex];
				const lastForgerAddress = delegateAddresses[generatorIndex - 1];
				const previousTimestamp = 10283;
				const currentTimestamp = 10290;
				const lastForgedHeight = 926;
				const nextForgedHeight = lastForgedHeight + 1;

				const context = createBlockContext({
					header: {
						height: nextForgedHeight,
						generatorAddress,
						timestamp: currentTimestamp,
					} as any,
					stateStore,
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				const missedBlocks: Record<string, number> = {};

				when(validatorsAPI.getGeneratorsBetweenTimestamps)
					.calledWith(expect.anything(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), currentTimestamp)
					.mockReturnValue(generatorAddress);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), previousTimestamp)
					.mockReturnValue(lastForgerAddress);

				await dpos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(delegateAddresses.length + 1);
				for (const delegateAddress of delegateAddresses) {
					const currentDelegate = await delegateStore.getWithSchema<DelegateAccount>(
						delegateAddress,
						delegateStoreSchema,
					);
					expect(currentDelegate.consecutiveMissedBlocks).toBe(0);
					if (delegateAddress.equals(generatorAddress)) {
						expect(currentDelegate.lastGeneratedHeight).toBe(nextForgedHeight);
					}
				}
			});
		});

		describe('when forger missed a block has 50 consecutive missed block, but forged within 260k blocks', () => {
			it('should not ban the missed forger', async () => {
				const generatorIndex = delegateAddresses.length - 1;
				const missedDelegateIndex = generatorIndex - 1;
				const generatorAddress = delegateAddresses[generatorIndex];
				const missedDelegate = delegateAddresses[missedDelegateIndex];
				const lastForgerAddress = delegateAddresses[generatorIndex - 2];
				const previousTimestamp = 10000270;
				const currentTimestamp = 10000290;
				const lastForgedHeight = 920006;
				const nextForgedHeight = lastForgedHeight + 1;

				const context = createBlockContext({
					header: {
						height: nextForgedHeight,
						generatorAddress,
						timestamp: currentTimestamp,
					} as any,
					stateStore,
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				const missedBlocks: Record<string, number> = {};
				missedBlocks[missedDelegate.toString('binary')] = 1;

				when(validatorsAPI.getGeneratorsBetweenTimestamps)
					.calledWith(expect.anything(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), currentTimestamp)
					.mockReturnValue(generatorAddress);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), previousTimestamp)
					.mockReturnValue(lastForgerAddress);

				delegateData[missedDelegateIndex].consecutiveMissedBlocks = 50;
				delegateData[missedDelegateIndex].lastGeneratedHeight = nextForgedHeight - 260000 + 5000;

				await delegateStore.setWithSchema(
					missedDelegate,
					delegateData[missedDelegateIndex],
					delegateStoreSchema,
				);

				await dpos['_updateProductivity'](context, previousTimestamp);

				const currentDelegate = await delegateStore.getWithSchema<DelegateAccount>(
					missedDelegate,
					delegateStoreSchema,
				);
				expect(currentDelegate.isBanned).toBeFalse();
				expect(currentDelegate.consecutiveMissedBlocks).toBe(51);
			});
		});

		describe('when forger missed a block has not forged within 260k blocks, but does not have 50 consecutive missed block', () => {
			it('should not ban the missed forger', async () => {
				const generatorIndex = delegateAddresses.length - 1;
				const missedDelegateIndex = generatorIndex - 1;
				const generatorAddress = delegateAddresses[generatorIndex];
				const missedDelegate = delegateAddresses[missedDelegateIndex];
				const lastForgerAddress = delegateAddresses[generatorIndex - 2];
				const previousTimestamp = 10000270;
				const currentTimestamp = 10000290;
				const lastForgedHeight = 920006;
				const nextForgedHeight = lastForgedHeight + 1;

				const context = createBlockContext({
					header: {
						height: nextForgedHeight,
						generatorAddress,
						timestamp: currentTimestamp,
					} as any,
					stateStore,
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				const missedBlocks: Record<string, number> = {};
				missedBlocks[missedDelegate.toString('binary')] = 1;

				when(validatorsAPI.getGeneratorsBetweenTimestamps)
					.calledWith(expect.anything(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), currentTimestamp)
					.mockReturnValue(generatorAddress);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), previousTimestamp)
					.mockReturnValue(lastForgerAddress);

				delegateData[missedDelegateIndex].consecutiveMissedBlocks = 40;
				delegateData[missedDelegateIndex].lastGeneratedHeight = nextForgedHeight - 260000 - 1;

				await delegateStore.setWithSchema(
					missedDelegate,
					delegateData[missedDelegateIndex],
					delegateStoreSchema,
				);

				await dpos['_updateProductivity'](context, previousTimestamp);

				const currentDelegate = await delegateStore.getWithSchema<DelegateAccount>(
					missedDelegate,
					delegateStoreSchema,
				);
				expect(currentDelegate.isBanned).toBeFalse();
				expect(currentDelegate.consecutiveMissedBlocks).toBe(41);
			});
		});

		describe('when forger missed a block has 50 consecutive missed block, and not forged within 260k blocks', () => {
			it('should ban the missed forger', async () => {
				const generatorIndex = delegateAddresses.length - 1;
				const missedDelegateIndex = generatorIndex - 1;
				const generatorAddress = delegateAddresses[generatorIndex];
				const missedDelegate = delegateAddresses[missedDelegateIndex];
				const lastForgerAddress = delegateAddresses[generatorIndex - 2];
				const previousTimestamp = 10000270;
				const currentTimestamp = 10000290;
				const lastForgedHeight = 920006;
				const nextForgedHeight = lastForgedHeight + 1;

				const context = createBlockContext({
					header: {
						height: nextForgedHeight,
						generatorAddress,
						timestamp: currentTimestamp,
					} as any,
					stateStore,
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				const missedBlocks: Record<string, number> = {};
				missedBlocks[missedDelegate.toString('binary')] = 1;

				when(validatorsAPI.getGeneratorsBetweenTimestamps)
					.calledWith(expect.anything(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), currentTimestamp)
					.mockReturnValue(generatorAddress);

				when(validatorsAPI.getGeneratorAtTimestamp)
					.calledWith(expect.anything(), previousTimestamp)
					.mockReturnValue(lastForgerAddress);

				delegateData[missedDelegateIndex].consecutiveMissedBlocks = 50;
				delegateData[missedDelegateIndex].lastGeneratedHeight = nextForgedHeight - 260000 - 1;

				await delegateStore.setWithSchema(
					missedDelegate,
					delegateData[missedDelegateIndex],
					delegateStoreSchema,
				);

				await dpos['_updateProductivity'](context, previousTimestamp);

				const currentDelegate = await delegateStore.getWithSchema<DelegateAccount>(
					missedDelegate,
					delegateStoreSchema,
				);
				expect(currentDelegate.isBanned).toBeTrue();
				expect(currentDelegate.consecutiveMissedBlocks).toBe(51);
			});
		});
	});

	describe('afterTransactionsExecute', () => {
		const genesisData: GenesisData = {
			height: 0,
			initRounds: 3,
			initDelegates: [],
		};
		const bootstrapRounds = genesisData.initRounds;

		const randomAPI: any = {};
		const bftAPI: any = {};
		const tokenAPI: any = {};
		const validatorsAPI: any = {};

		let stateStore: StateStore;
		let height: number;
		let context: BlockAfterExecuteContext;
		let dpos: DPoSModule;
		let previousTimestampStore: SubStore;
		let currentTimestamp: number;
		let previousTimestamp: number;
		let genesisDataStore: SubStore;

		beforeEach(async () => {
			dpos = new DPoSModule();
			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfigs,
			});
			dpos.addDependencies(randomAPI, bftAPI, validatorsAPI, tokenAPI);

			stateStore = new StateStore(new InMemoryKVStore());

			previousTimestampStore = stateStore.getStore(dpos.id, STORE_PREFIX_PREVIOUS_TIMESTAMP);
			genesisDataStore = stateStore.getStore(dpos.id, STORE_PREFIX_GENESIS_DATA);

			await genesisDataStore.setWithSchema(EMPTY_KEY, genesisData, genesisDataStoreSchema);

			jest.spyOn(dpos as any, '_createVoteWeightSnapshot').mockImplementation();
			jest.spyOn(dpos as any, '_updateProductivity').mockImplementation();
			jest.spyOn(dpos as any, '_updateValidators').mockImplementation();
		});

		describe('when its the last block of round after bootstrap period', () => {
			beforeEach(async () => {
				height = 103 * (bootstrapRounds + 1);
				currentTimestamp = height * 10;
				previousTimestamp = (height - 1) * 10;

				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({
						height,
						timestamp: currentTimestamp,
					}),
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				await dpos.afterTransactionsExecute(context);
			});

			it('should create vote weight snapshot', () => {
				expect(dpos['_createVoteWeightSnapshot']).toHaveBeenCalledTimes(1);
				expect(dpos['_createVoteWeightSnapshot']).toHaveBeenCalledWith(context);
			});

			it('should update validators', () => {
				expect(dpos['_updateValidators']).toHaveBeenCalledTimes(1);
				expect(dpos['_updateValidators']).toHaveBeenCalledWith(context);
			});
		});

		describe('when its not the last block of round after bootstrap period', () => {
			beforeEach(async () => {
				height = 103 * (bootstrapRounds + 1) - 3;
				currentTimestamp = height * 10;
				previousTimestamp = (height - 1) * 10;

				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({
						height,
						timestamp: currentTimestamp,
					}),
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				await dpos.afterTransactionsExecute(context);
			});

			it('should not create vote weight snapshot', () => {
				expect(dpos['_createVoteWeightSnapshot']).toHaveBeenCalledTimes(0);
			});

			it('should not update validators', () => {
				expect(dpos['_updateValidators']).toHaveBeenCalledTimes(0);
			});
		});

		describe('when its the last block of bootstrap period', () => {
			beforeEach(async () => {
				height = 103 * bootstrapRounds;
				currentTimestamp = height * 10;
				previousTimestamp = (height - 1) * 10;

				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({
						height,
						timestamp: currentTimestamp,
					}),
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				await dpos.afterTransactionsExecute(context);
			});

			it('should create vote weight snapshot', () => {
				expect(dpos['_createVoteWeightSnapshot']).toHaveBeenCalledTimes(1);
				expect(dpos['_createVoteWeightSnapshot']).toHaveBeenCalledWith(context);
			});

			it('should update validators', () => {
				expect(dpos['_updateValidators']).toHaveBeenCalledTimes(1);
				expect(dpos['_updateValidators']).toHaveBeenCalledWith(context);
			});
		});

		describe('when its a block before bootstrap period last block', () => {
			beforeEach(async () => {
				height = 103 * (bootstrapRounds - 1);
				currentTimestamp = height * 10;
				previousTimestamp = (height - 1) * 10;

				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({
						height,
						timestamp: currentTimestamp,
					}),
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				await dpos.afterTransactionsExecute(context);
			});

			it('should create vote weight snapshot', () => {
				expect(dpos['_createVoteWeightSnapshot']).toHaveBeenCalledTimes(1);
				expect(dpos['_createVoteWeightSnapshot']).toHaveBeenCalledWith(context);
			});

			it('should not update validators', () => {
				expect(dpos['_updateValidators']).toHaveBeenCalledTimes(0);
			});
		});

		describe('when hook exits successfully', () => {
			beforeEach(async () => {
				height = 103;
				currentTimestamp = 1030;
				previousTimestamp = 1020;

				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({
						height,
						timestamp: currentTimestamp,
					}),
				}).getBlockAfterExecuteContext();

				await previousTimestampStore.setWithSchema(
					EMPTY_KEY,
					{ timestamp: previousTimestamp },
					previousTimestampStoreSchema,
				);

				await dpos.afterTransactionsExecute(context);
			});

			it('should set previousTimestamp to current timestamp', async () => {
				const nextPreviousTimestampData = await previousTimestampStore.getWithSchema<PreviousTimestampData>(
					EMPTY_KEY,
					previousTimestampStoreSchema,
				);
				const nextPreviousTimestamp = nextPreviousTimestampData.timestamp;
				expect(nextPreviousTimestamp).toBe(currentTimestamp);
			});
		});
	});
});
