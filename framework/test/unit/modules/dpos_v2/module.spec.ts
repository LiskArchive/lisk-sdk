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

import { BlockAssets } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';
import { codec } from '@liskhq/lisk-codec';
import { GenesisConfig } from '../../../../src/types';
import { DPoSModule } from '../../../../src/modules/dpos_v2';
import * as forgerSelectionLessTHan103Scenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_less_than_103.json';
import * as forgerSelectionZeroStandbyScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_0_standby.json';
import * as forgerSelectionOneStandbyScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_exactly_1_standby.json';
import * as forgerSelectionTwoStandbyScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_exactly_2_standby.json';
import * as forgerSelectionMoreThan2StandByScenario from '../../../fixtures/dpos_forger_selection/dpos_forger_selection_more_than_2_standby.json';
import {
	BlockAfterExecuteContext,
	BlockContext,
	GenesisBlockContext,
} from '../../../../src/state_machine';
import {
	createBlockContext,
	createFakeBlockHeader,
	createGenesisBlockContext,
	createTransientMethodContext,
} from '../../../../src/testing';
import { genesisStoreSchema } from '../../../../src/modules/dpos_v2/schemas';
import {
	DelegateAccount,
	GenesisData,
	ValidatorsMethod,
} from '../../../../src/modules/dpos_v2/types';
import { GenesisBlockExecuteContext, Validator } from '../../../../src/state_machine/types';
import { invalidAssets, validAsset } from './genesis_block_test_data';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { DelegateStore } from '../../../../src/modules/dpos_v2/stores/delegate';
import { VoterStore } from '../../../../src/modules/dpos_v2/stores/voter';
import { NameStore } from '../../../../src/modules/dpos_v2/stores/name';
import { PreviousTimestampStore } from '../../../../src/modules/dpos_v2/stores/previous_timestamp';
import { GenesisDataStore } from '../../../../src/modules/dpos_v2/stores/genesis';
import { SnapshotStore } from '../../../../src/modules/dpos_v2/stores/snapshot';
import { createStoreGetter } from '../../../../src/testing/utils';
import { EligibleDelegatesStore } from '../../../../src/modules/dpos_v2/stores/eligible_delegates';
import { getDelegateWeight, ValidatorWeight } from '../../../../src/modules/dpos_v2/utils';

describe('DPoS module', () => {
	const EMPTY_KEY = Buffer.alloc(0);
	const defaultConfig = {
		factorSelfVotes: 10,
		maxLengthName: 20,
		maxNumberSentVotes: 10,
		maxNumberPendingUnlocks: 20,
		failSafeMissedBlocks: 50,
		failSafeInactiveWindow: 260000,
		punishmentWindow: 780000,
		roundLength: 103,
		minWeightStandby: (BigInt(1000) * BigInt(10 ** 8)).toString(),
		numberActiveDelegates: 101,
		numberStandbyDelegates: 2,
		tokenIDDPoS: '0000000000000000',
		tokenIDFee: '0000000000000000',
		delegateRegistrationFee: (BigInt(10) * BigInt(10) ** BigInt(8)).toString(),
		maxBFTWeightCap: 500,
	};

	const sortValidatorsByWeightDesc = (validators: ValidatorWeight[]) =>
		validators.sort((a, b) => {
			const diff = BigInt(b.weight) - BigInt(a.weight);
			if (diff > BigInt(0)) {
				return 1;
			}
			if (diff < BigInt(0)) {
				return -1;
			}
			return a.address.compare(b.address);
		});

	let dpos: DPoSModule;
	beforeEach(() => {
		dpos = new DPoSModule();
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			await expect(
				dpos.init({ genesisConfig: {} as any, moduleConfig: {}, generatorConfig: {} }),
			).toResolve();

			expect(dpos['_moduleConfig']).toEqual({
				...defaultConfig,
				minWeightStandby: BigInt(defaultConfig.minWeightStandby),
				tokenIDDPoS: Buffer.from(defaultConfig.tokenIDDPoS, 'hex'),
				tokenIDFee: Buffer.from(defaultConfig.tokenIDFee, 'hex'),
				delegateRegistrationFee: BigInt(defaultConfig.delegateRegistrationFee),
			});
		});

		it('should initialize config with given value', async () => {
			await expect(
				dpos.init({
					genesisConfig: {} as any,
					moduleConfig: { ...defaultConfig, maxLengthName: 50 },
					generatorConfig: {},
				}),
			).toResolve();

			expect(dpos['_moduleConfig'].maxLengthName).toEqual(50);
		});
	});

	describe('initGenesisState', () => {
		let stateStore: PrefixedStateReadWriter;

		beforeEach(async () => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			const randomMethod = {
				getRandomBytes: jest.fn(),
			};
			const validatorMethod = {
				setValidatorGeneratorKey: jest.fn(),
				registerValidatorKeys: jest.fn().mockResolvedValue(true),
				getValidatorKeys: jest.fn().mockResolvedValue({
					blsKey: utils.getRandomBytes(48),
					generatorKey: utils.getRandomBytes(32),
				}),
				getGeneratorsBetweenTimestamps: jest.fn(),
				setValidatorsParams: jest.fn(),
			};
			const tokenMethod = {
				lock: jest.fn(),
				unlock: jest.fn(),
				getAvailableBalance: jest.fn(),
				burn: jest.fn(),
				getMinRemainingBalance: jest.fn(),
				transfer: jest.fn(),
				getLockedAmount: jest.fn().mockResolvedValue(BigInt(101000000000)),
			};
			dpos.addDependencies(randomMethod, validatorMethod, tokenMethod);

			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfig,
			});
		});

		describe.each(invalidAssets)('%p', (_, data, errString) => {
			it('should throw error when asset is invalid', async () => {
				// eslint-disable-next-line @typescript-eslint/ban-types
				const assetBytes = codec.encode(genesisStoreSchema, data as object);
				const context = createGenesisBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 12345 }),
					assets: new BlockAssets([{ module: dpos.name, data: assetBytes }]),
				}).createInitGenesisStateContext();
				jest.spyOn(dpos, 'finalizeGenesisState');

				await expect(dpos.initGenesisState(context)).rejects.toThrow(errString as string);
				expect(dpos.finalizeGenesisState).not.toHaveBeenCalled();
			});
		});

		describe('when the genesis asset is valid', () => {
			let genesisContext: GenesisBlockContext;
			let context: GenesisBlockExecuteContext;

			beforeEach(() => {
				const assetBytes = codec.encode(genesisStoreSchema, validAsset);
				genesisContext = createGenesisBlockContext({
					stateStore,
					assets: new BlockAssets([{ module: dpos.name, data: assetBytes }]),
				});
				context = genesisContext.createInitGenesisStateContext();
			});

			it('should store self vote and received votes', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();
				await expect(dpos.finalizeGenesisState(context)).toResolve();

				const delegateStore = dpos.stores.get(DelegateStore);
				await expect(delegateStore.get(context, validAsset.voters[0].address)).resolves.toEqual({
					name: expect.any(String),
					consecutiveMissedBlocks: 0,
					isBanned: false,
					lastGeneratedHeight: 0,
					pomHeights: [],
					selfVotes: BigInt(100000000000),
					totalVotesReceived: BigInt(200000000000),
					commission: 0,
					lastCommissionIncreaseHeight: 0,
					sharingCoefficients: [],
				});
			});

			it('should store all the votes', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();
				const voterStore = dpos.stores.get(VoterStore);
				expect.assertions(validAsset.voters.length + 1);
				for (const voter of validAsset.voters) {
					await expect(voterStore.get(context, voter.address)).resolves.toEqual({
						sentVotes: voter.sentVotes,
						pendingUnlocks: voter.pendingUnlocks,
					});
				}
			});

			it('should store all the delegates', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();
				const usernameStore = dpos.stores.get(NameStore);
				const allNames = await usernameStore.iterate(context, {
					gte: Buffer.from([0]),
					lte: Buffer.from([255]),
				});
				expect(allNames).toHaveLength(validAsset.validators.length);

				const delegateStore = dpos.stores.get(DelegateStore);
				const allDelegates = await delegateStore.iterate(context, {
					gte: Buffer.alloc(20, 0),
					lte: Buffer.alloc(20, 255),
				});
				expect(allDelegates).toHaveLength(validAsset.validators.length);
			});

			it('should store previous timestamp', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();

				const previousTimestampStore = dpos.stores.get(PreviousTimestampStore);
				await expect(previousTimestampStore.get(context, EMPTY_KEY)).resolves.toEqual({
					timestamp: context.header.timestamp,
				});
			});

			it('should store genesis data', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();

				const genesisDataStore = dpos.stores.get(GenesisDataStore);
				await expect(genesisDataStore.get(context, EMPTY_KEY)).resolves.toEqual({
					height: context.header.height,
					initRounds: validAsset.genesisData.initRounds,
					initDelegates: validAsset.genesisData.initDelegates,
				});
			});

			it('should register all active delegates as BFT validators', async () => {
				await expect(dpos.initGenesisState(context)).toResolve();
				await expect(dpos.finalizeGenesisState(context)).toResolve();

				expect(dpos['_validatorsMethod'].setValidatorsParams).toHaveBeenCalledWith(
					expect.any(Object),
					expect.any(Object),
					BigInt(68),
					BigInt(68),
					validAsset.genesisData.initDelegates.map(d => ({
						bftWeight: BigInt(1),
						address: d,
					})),
				);
			});

			it('should fail if registerValidatorKeys return false', async () => {
				(dpos['_validatorsMethod'].registerValidatorKeys as jest.Mock).mockResolvedValue(false);

				await expect(dpos.initGenesisState(context)).toResolve();
				await expect(dpos.finalizeGenesisState(context)).rejects.toThrow('Invalid validator key');
			});

			it('should fail if getLockedAmount return different value', async () => {
				(dpos['_tokenMethod'].getLockedAmount as jest.Mock).mockResolvedValue(BigInt(0));

				await expect(dpos.initGenesisState(context)).toResolve();
				await expect(dpos.finalizeGenesisState(context)).rejects.toThrow(
					'Voted amount is not locked',
				);
			});
		});
	});

	describe('_createVoteWeightSnapshot', () => {
		beforeEach(async () => {
			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfig,
			});
		});

		describe('when all eligible delegates are not punished', () => {
			const fixtures = forgerSelectionLessTHan103Scenario.testCases.input.voteWeights;

			let context: BlockAfterExecuteContext;
			let stateStore: PrefixedStateReadWriter;

			beforeEach(async () => {
				stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
				const eligibleDelegateStore = dpos.stores.get(EligibleDelegatesStore);
				for (const data of fixtures) {
					const ctx = createTransientMethodContext({ stateStore });
					await eligibleDelegateStore.set(
						ctx,
						eligibleDelegateStore.getKey(
							Buffer.from(data.address, 'hex'),
							getDelegateWeight(
								BigInt(defaultConfig.factorSelfVotes),
								BigInt(data.voteWeight),
								BigInt(data.voteWeight),
							),
						),
						{ lastPomHeight: 0 },
					);
				}
				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 1030 }),
				}).getBlockAfterExecuteContext();
			});

			it('should create a snapshot which include all delegates', async () => {
				await dpos['_createVoteWeightSnapshot'](context);

				const snapshotStore = dpos.stores.get(SnapshotStore);
				const snapshot = await snapshotStore.get(context, utils.intToBuffer(11 + 2, 4));

				expect(snapshot.delegateWeightSnapshot).toHaveLength(fixtures.length);
			});
		});

		describe('when there are delegates who are PoMed', () => {
			const fixtures = forgerSelectionMoreThan2StandByScenario.testCases.input.voteWeights;

			let context: BlockAfterExecuteContext;
			let stateStore: PrefixedStateReadWriter;

			beforeEach(async () => {
				stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 1030000 }),
				}).getBlockAfterExecuteContext();
				const eligibleDelegateStore = dpos.stores.get(EligibleDelegatesStore);
				// set first delegate banned
				await eligibleDelegateStore.set(
					context,
					eligibleDelegateStore.getKey(
						Buffer.from(fixtures[0].address, 'hex'),
						BigInt(fixtures[0].voteWeight),
					),
					{
						lastPomHeight: 1000,
					},
				);
				await eligibleDelegateStore.set(
					context,
					eligibleDelegateStore.getKey(
						Buffer.from(fixtures[1].address, 'hex'),
						BigInt(fixtures[1].voteWeight),
					),
					{
						lastPomHeight: 250001,
					},
				);
				await eligibleDelegateStore.set(
					context,
					eligibleDelegateStore.getKey(
						Buffer.from(fixtures[2].address, 'hex'),
						BigInt(fixtures[2].voteWeight),
					),
					{
						lastPomHeight: 250000,
					},
				);
				for (const data of fixtures.slice(3)) {
					await eligibleDelegateStore.set(
						context,
						eligibleDelegateStore.getKey(Buffer.from(data.address, 'hex'), BigInt(data.voteWeight)),
						{
							lastPomHeight: 0,
						},
					);
				}
				const snapshotStore = dpos.stores.get(SnapshotStore);
				await snapshotStore.set(context, utils.intToBuffer(10000, 4), {
					delegateWeightSnapshot: [],
				});
				await snapshotStore.set(context, utils.intToBuffer(10001, 4), {
					delegateWeightSnapshot: [],
				});
				await snapshotStore.set(context, utils.intToBuffer(10002, 4), {
					delegateWeightSnapshot: [],
				});

				await dpos['_createVoteWeightSnapshot'](context);
			});

			it('should create a snapshot which includes all delegates who are not currently punished', async () => {
				const snapshotStore = dpos.stores.get(SnapshotStore);
				const snapshot = await snapshotStore.get(context, utils.intToBuffer(10001 + 2, 4));

				// Remove punished delegates
				expect(snapshot.delegateWeightSnapshot).toHaveLength(fixtures.length - 1);
			});

			it('should remove the snapshot older than 3 rounds', async () => {
				const snapshotStore = dpos.stores.get(SnapshotStore);

				await expect(snapshotStore.has(context, utils.intToBuffer(10000, 4))).resolves.toBeFalse();
				await expect(snapshotStore.has(context, utils.intToBuffer(10001, 4))).resolves.toBeTrue();
				await expect(snapshotStore.has(context, utils.intToBuffer(10002, 4))).resolves.toBeTrue();
			});
		});
	});

	describe('_updateValidators', () => {
		beforeEach(async () => {
			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfig,
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
			const defaultRound = 110;

			for (const scenario of scenarios) {
				// eslint-disable-next-line jest/valid-title,no-loop-func
				describe(scenario.title, () => {
					it('should result in the expected forgers list', async () => {
						// Forger selection relies on vote weight to be sorted
						const delegates = [
							...scenario.testCases.input.voteWeights.map(d => ({
								address: Buffer.from(d.address, 'hex'),
								weight: BigInt(d.voteWeight),
							})),
						];
						sortValidatorsByWeightDesc(delegates);
						const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
						const blockContext = createBlockContext({
							header: createFakeBlockHeader({
								height: (defaultRound - 1) * defaultConfig.roundLength,
							}),
							stateStore,
						});
						const context = blockContext.getBlockAfterExecuteContext();
						await dpos.stores.get(GenesisDataStore).set(context, EMPTY_KEY, {
							height: 0,
							initRounds: 3,
							initDelegates: [],
						});
						const snapshotStore = dpos.stores.get(SnapshotStore);
						await snapshotStore.set(context, utils.intToBuffer(defaultRound, 4), {
							delegateWeightSnapshot: delegates,
						});
						const randomMethod = {
							getRandomBytes: jest
								.fn()
								.mockResolvedValueOnce(Buffer.from(scenario.testCases.input.randomSeed1, 'hex'))
								.mockResolvedValueOnce(Buffer.from(scenario.testCases.input.randomSeed2, 'hex')),
						};

						const validatorMethod = {
							setValidatorGeneratorKey: jest.fn(),
							registerValidatorKeys: jest.fn(),
							getValidatorKeys: jest.fn().mockResolvedValue({
								blsKey: utils.getRandomBytes(48),
								generatorKey: utils.getRandomBytes(32),
							}),
							getGeneratorsBetweenTimestamps: jest.fn(),
							setValidatorsParams: jest.fn(),
						};
						const tokenMethod = {
							lock: jest.fn(),
							unlock: jest.fn(),
							getAvailableBalance: jest.fn(),
							burn: jest.fn(),
							getMinRemainingBalance: jest.fn(),
							transfer: jest.fn(),
							getLockedAmount: jest.fn(),
						};

						dpos.addDependencies(randomMethod, validatorMethod, tokenMethod);

						await dpos['_updateValidators'](context);

						expect(validatorMethod.setValidatorsParams).toHaveBeenCalledTimes(1);
					});
				});
			}
		});

		describe('when there are enough standby delegates', () => {
			const defaultRound = 123;
			let validatorMethod: ValidatorsMethod;
			let blockContext: BlockContext;

			const scenario = forgerSelectionMoreThan2StandByScenario;

			beforeEach(async () => {
				// Forger selection relies on vote weight to be sorted
				const delegates: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.voteWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.voteWeight),
					})),
				];
				sortValidatorsByWeightDesc(delegates);

				const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
				blockContext = createBlockContext({
					header: createFakeBlockHeader({
						height: (defaultRound - 1) * defaultConfig.roundLength,
					}),
					stateStore,
				});
				await dpos.stores
					.get(GenesisDataStore)
					.set(blockContext.getBlockExecuteContext(), EMPTY_KEY, {
						height: 0,
						initRounds: 3,
						initDelegates: [],
					});
				const snapshotStore = dpos.stores.get(SnapshotStore);
				await snapshotStore.set(
					blockContext.getBlockExecuteContext(),
					utils.intToBuffer(defaultRound, 4),
					{
						delegateWeightSnapshot: delegates,
					},
				);
				const randomMethod = {
					getRandomBytes: jest
						.fn()
						.mockResolvedValueOnce(Buffer.from(scenario.testCases.input.randomSeed1, 'hex'))
						.mockResolvedValueOnce(Buffer.from(scenario.testCases.input.randomSeed2, 'hex')),
				};
				validatorMethod = {
					setValidatorGeneratorKey: jest.fn(),
					registerValidatorKeys: jest.fn(),
					getValidatorKeys: jest.fn().mockResolvedValue({
						blsKey: utils.getRandomBytes(48),
						generatorKey: utils.getRandomBytes(32),
					}),
					getGeneratorsBetweenTimestamps: jest.fn(),
					setValidatorsParams: jest.fn(),
				};
				const tokenMethod = {
					lock: jest.fn(),
					unlock: jest.fn(),
					getAvailableBalance: jest.fn(),
					burn: jest.fn(),
					getMinRemainingBalance: jest.fn(),
					transfer: jest.fn(),
					getLockedAmount: jest.fn(),
				};

				dpos.addDependencies(randomMethod, validatorMethod, tokenMethod);

				await dpos['_updateValidators'](blockContext.getBlockAfterExecuteContext());
			});

			it('should have activeDelegates + standbyDelegates delegates in the generators list', () => {
				expect((validatorMethod.setValidatorsParams as jest.Mock).mock.calls[0][4]).toHaveLength(
					defaultConfig.roundLength,
				);
			});

			it('should store selected stand by delegates in the generators list', () => {
				const { selectedForgers } = scenario.testCases.output;
				const standbyDelegatesInFixture = [
					Buffer.from(selectedForgers[selectedForgers.length - 1], 'hex'),
					Buffer.from(selectedForgers[selectedForgers.length - 2], 'hex'),
				].sort((a, b) => a.compare(b));

				const updatedValidators = (validatorMethod.setValidatorsParams as jest.Mock).mock
					.calls[0][4] as Validator[];
				const standbyCandidatesAddresses = updatedValidators
					.filter(
						validator =>
							standbyDelegatesInFixture.find(fixture => fixture.equals(validator.address)) !==
							undefined,
					)
					.sort((a, b) => a.address.compare(b.address))
					.map(validator => validator.address);

				expect(standbyCandidatesAddresses).toHaveLength(2);
				expect(standbyCandidatesAddresses).toEqual(standbyDelegatesInFixture);
			});
		});
	});

	describe('_updateProductivity', () => {
		const randomMethod: any = {};
		const tokenMethod: any = {};

		let validatorsMethod: any;
		let stateStore: PrefixedStateReadWriter;
		let delegateData: DelegateAccount[];
		let delegateAddresses: Buffer[];
		let previousTimestampStore: PreviousTimestampStore;
		let delegateStore: DelegateStore;

		beforeEach(async () => {
			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfig,
			});

			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

			validatorsMethod = {
				getGeneratorsBetweenTimestamps: jest.fn(),
			};

			dpos.addDependencies(randomMethod, validatorsMethod, tokenMethod);

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
					commission: 0,
					lastCommissionIncreaseHeight: 0,
					sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
				}));
			delegateAddresses = Array.from({ length: 103 }, _ => utils.getRandomBytes(20));

			previousTimestampStore = dpos.stores.get(PreviousTimestampStore);
			delegateStore = dpos.stores.get(DelegateStore);

			for (let i = 0; i < 103; i += 1) {
				await delegateStore.set(
					createStoreGetter(stateStore),
					delegateAddresses[i],
					delegateData[i],
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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

				const missedBlocks: Record<string, number> = {};
				// Make every delegate miss its block-slot except gte and end slots
				for (let i = 0; i < 102; i += 1) {
					missedBlocks[delegateAddresses[i].toString('binary')] = 1;
				}

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				await dpos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(delegateAddresses.length + 1);
				for (const delegateAddress of delegateAddresses) {
					const currentDelegate = await delegateStore.get(
						createStoreGetter(stateStore),
						delegateAddress,
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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

				const missedBlocks: Record<string, number> = {};
				for (let i = 1; i < missedForgers.length + 1; i += 1) {
					missedBlocks[missedForgers[2 - i].toString('binary')] = 1;
				}

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				await dpos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(delegateAddresses.length);
				for (const delegateAddress of delegateAddresses) {
					const currentDelegate = await delegateStore.get(
						createStoreGetter(stateStore),
						delegateAddress,
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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

				const missedBlocks: Record<string, number> = {};
				for (const delegateAddress of delegateAddresses) {
					missedBlocks[delegateAddress.toString('binary')] = 1;
				}
				for (const delegateAddress of missedMoreThan1Block) {
					missedBlocks[delegateAddress.toString('binary')] += 1;
				}

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				await dpos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(delegateAddresses.length);
				for (const delegateAddress of delegateAddresses) {
					const currentDelegate = await delegateStore.get(
						createStoreGetter(stateStore),
						delegateAddress,
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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

				const missedBlocks: Record<string, number> = {};

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				await dpos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(delegateAddresses.length + 1);
				for (const delegateAddress of delegateAddresses) {
					const currentDelegate = await delegateStore.get(
						createStoreGetter(stateStore),
						delegateAddress,
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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

				const missedBlocks: Record<string, number> = {};
				missedBlocks[missedDelegate.toString('binary')] = 1;

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				delegateData[missedDelegateIndex].consecutiveMissedBlocks = 50;
				delegateData[missedDelegateIndex].lastGeneratedHeight = nextForgedHeight - 260000 + 5000;

				await delegateStore.set(
					createStoreGetter(stateStore),
					missedDelegate,
					delegateData[missedDelegateIndex],
				);

				await dpos['_updateProductivity'](context, previousTimestamp);

				const currentDelegate = await delegateStore.get(
					createStoreGetter(stateStore),
					missedDelegate,
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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

				const missedBlocks: Record<string, number> = {};
				missedBlocks[missedDelegate.toString('binary')] = 1;

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				delegateData[missedDelegateIndex].consecutiveMissedBlocks = 40;
				delegateData[missedDelegateIndex].lastGeneratedHeight = nextForgedHeight - 260000 - 1;

				await delegateStore.set(
					createStoreGetter(stateStore),
					missedDelegate,
					delegateData[missedDelegateIndex],
				);

				await dpos['_updateProductivity'](context, previousTimestamp);

				const currentDelegate = await delegateStore.get(
					createStoreGetter(stateStore),
					missedDelegate,
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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

				const missedBlocks: Record<string, number> = {};
				missedBlocks[missedDelegate.toString('binary')] = 1;

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				delegateData[missedDelegateIndex].consecutiveMissedBlocks = 50;
				delegateData[missedDelegateIndex].lastGeneratedHeight = nextForgedHeight - 260000 - 1;

				await delegateStore.set(
					createStoreGetter(stateStore),
					missedDelegate,
					delegateData[missedDelegateIndex],
				);

				await dpos['_updateProductivity'](context, previousTimestamp);

				const currentDelegate = await delegateStore.get(
					createStoreGetter(stateStore),
					missedDelegate,
				);
				expect(currentDelegate.isBanned).toBeTrue();
				expect(currentDelegate.consecutiveMissedBlocks).toBe(51);
			});
		});
	});

	describe('_getActiveDelegates', () => {
		let stateStore: PrefixedStateReadWriter;
		let context: BlockAfterExecuteContext;

		const scenario = forgerSelectionMoreThan2StandByScenario;
		const initDelegates = new Array(101).fill(0).map(() => utils.getRandomBytes(20));

		beforeEach(async () => {
			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfig,
			});

			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			await dpos.stores.get(GenesisDataStore).set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 0,
				initRounds: 3,
				initDelegates,
			});
			jest.spyOn(dpos, '_capWeight' as never);
		});

		describe('when current round is less than initRounds + numberOfActiveDelegates', () => {
			it('should select init delegates for initRounds + numberOfActiveDelegates - round', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on vote weight to be sorted
				const delegates: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.voteWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.voteWeight),
					})),
				];
				sortValidatorsByWeightDesc(delegates);

				const result = await dpos['_getActiveDelegates'](context, delegates, 6);
				expect(result).toHaveLength(defaultConfig.numberActiveDelegates);
				const fromInitDelegates = result.filter(
					v => initDelegates.findIndex(address => v.address.equals(address)) > -1,
				);
				expect(fromInitDelegates).toHaveLength(3 + defaultConfig.numberActiveDelegates - 6);
			});

			it('should not select the same delegate twice', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on vote weight to be sorted
				const delegates: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.voteWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.voteWeight),
					})),
				];
				sortValidatorsByWeightDesc(delegates);
				// Overwrite the snapshot validator address to be the one in init delegates
				const [duplicateAddress] = initDelegates;
				delegates[0].address = duplicateAddress;

				const result = await dpos['_getActiveDelegates'](context, delegates, 6);

				expect(result).toHaveLength(defaultConfig.numberActiveDelegates);
				const duplicateAddressList = result.filter(v => v.address.equals(initDelegates[0]));
				expect(duplicateAddressList).toHaveLength(1);
			});

			it('should not select from init delegates if there is not enough snapshot validators', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on vote weight to be sorted
				const delegates: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.voteWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.voteWeight),
					})),
				].slice(10);
				sortValidatorsByWeightDesc(delegates);

				// Overwrite the snapshot validator address to be the one in init delegates
				const [duplicateAddress] = initDelegates;
				delegates[0].address = duplicateAddress;

				const result = await dpos['_getActiveDelegates'](context, delegates, 6);

				expect(result).toHaveLength(defaultConfig.numberActiveDelegates);
			});
		});

		describe('when current round is more than initRounds + numberOfActiveDelegates', () => {
			it('should all if snapshotValidators is less than numberOfActiveDelegates', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on vote weight to be sorted
				const delegates: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.voteWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.voteWeight),
					})),
				].slice(0, 10);
				sortValidatorsByWeightDesc(delegates);

				const result = await dpos['_getActiveDelegates'](context, delegates, 104);
				expect(result).toHaveLength(10);
				expect(dpos['_capWeight']).not.toHaveBeenCalled();
			});

			it('should numberOfActiveDelegates if snapshotValidators is longer', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on vote weight to be sorted
				const delegates: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.voteWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.voteWeight),
					})),
				];
				sortValidatorsByWeightDesc(delegates);

				const result = await dpos['_getActiveDelegates'](context, delegates, 104);
				expect(result).toHaveLength(defaultConfig.numberActiveDelegates);
			});

			it('should cap the weight if activeDelegates is more than capValue', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on vote weight to be sorted
				const delegates: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.voteWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.voteWeight),
					})),
				];
				sortValidatorsByWeightDesc(delegates);

				await dpos['_getActiveDelegates'](context, delegates, 104);
				expect(dpos['_capWeight']).toHaveBeenCalledWith(
					expect.any(Array),
					defaultConfig.maxBFTWeightCap,
				);
			});
		});
	});

	describe('_capWeight', () => {
		it('should cap the validators input to the value', () => {
			const addresses = new Array(5).fill(0).map(() => utils.getRandomBytes(20));
			const cases = [
				{
					validators: [
						{ address: addresses[0], weight: BigInt(1350) },
						{ address: addresses[1], weight: BigInt(300) },
						{ address: addresses[2], weight: BigInt(150) },
						{ address: addresses[3], weight: BigInt(150) },
						{ address: addresses[4], weight: BigInt(50) },
					],
					capValue: 3000,
					expectedValidators: [
						{ address: addresses[0], weight: BigInt(262) },
						{ address: addresses[1], weight: BigInt(262) },
						{ address: addresses[2], weight: BigInt(150) },
						{ address: addresses[3], weight: BigInt(150) },
						{ address: addresses[4], weight: BigInt(50) },
					],
				},
				{
					validators: [
						{ address: addresses[0], weight: BigInt(1350) },
						{ address: addresses[1], weight: BigInt(300) },
						{ address: addresses[2], weight: BigInt(150) },
						{ address: addresses[3], weight: BigInt(150) },
						{ address: addresses[4], weight: BigInt(50) },
					],
					capValue: 5000,
					expectedValidators: [
						{ address: addresses[0], weight: BigInt(650) },
						{ address: addresses[1], weight: BigInt(300) },
						{ address: addresses[2], weight: BigInt(150) },
						{ address: addresses[3], weight: BigInt(150) },
						{ address: addresses[4], weight: BigInt(50) },
					],
				},
			];

			for (const c of cases) {
				dpos['_capWeight'](c.validators, c.capValue);
				expect(c.validators).toEqual(c.expectedValidators);
			}
		});
	});

	describe('afterTransactionsExecute', () => {
		const genesisData: GenesisData = {
			height: 0,
			initRounds: 3,
			initDelegates: [],
		};
		const bootstrapRounds = genesisData.initRounds;

		const randomMethod: any = {};
		const tokenMethod: any = {};
		const validatorsMethod: any = {};

		let stateStore: PrefixedStateReadWriter;
		let height: number;
		let context: BlockAfterExecuteContext;
		let previousTimestampStore: PreviousTimestampStore;
		let currentTimestamp: number;
		let previousTimestamp: number;
		let genesisDataStore: GenesisDataStore;

		beforeEach(async () => {
			await dpos.init({
				generatorConfig: {},
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfig,
			});
			dpos.addDependencies(randomMethod, validatorsMethod, tokenMethod);

			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

			previousTimestampStore = dpos.stores.get(PreviousTimestampStore);
			genesisDataStore = dpos.stores.get(GenesisDataStore);

			await genesisDataStore.set(
				createTransientMethodContext({ stateStore }),
				EMPTY_KEY,
				genesisData,
			);

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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

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

				await previousTimestampStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
					timestamp: previousTimestamp,
				});

				await dpos.afterTransactionsExecute(context);
			});

			it('should set previousTimestamp to current timestamp', async () => {
				const nextPreviousTimestampData = await previousTimestampStore.get(
					createStoreGetter(stateStore),
					EMPTY_KEY,
				);
				const nextPreviousTimestamp = nextPreviousTimestampData.timestamp;
				expect(nextPreviousTimestamp).toBe(currentTimestamp);
			});
		});
	});
});
