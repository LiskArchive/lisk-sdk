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
import { PoSModule } from '../../../../src/modules/pos';
import * as forgerSelectionLessTHan103Scenario from '../../../fixtures/pos_forger_selection/pos_forger_selection_less_than_103.json';
import * as forgerSelectionZeroStandbyScenario from '../../../fixtures/pos_forger_selection/pos_forger_selection_0_standby.json';
import * as forgerSelectionOneStandbyScenario from '../../../fixtures/pos_forger_selection/pos_forger_selection_exactly_1_standby.json';
import * as forgerSelectionTwoStandbyScenario from '../../../fixtures/pos_forger_selection/pos_forger_selection_exactly_2_standby.json';
import * as forgerSelectionMoreThan2StandByScenario from '../../../fixtures/pos_forger_selection/pos_forger_selection_more_than_2_standby.json';
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
import { genesisStoreSchema } from '../../../../src/modules/pos/schemas';
import { GenesisData, ValidatorsMethod } from '../../../../src/modules/pos/types';
import { GenesisBlockExecuteContext, Validator } from '../../../../src/state_machine/types';
import { invalidAssets, validAsset } from './genesis_block_test_data';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { ValidatorAccount, ValidatorStore } from '../../../../src/modules/pos/stores/validator';
import { StakerStore } from '../../../../src/modules/pos/stores/staker';
import { NameStore } from '../../../../src/modules/pos/stores/name';
import { PreviousTimestampStore } from '../../../../src/modules/pos/stores/previous_timestamp';
import { GenesisDataStore } from '../../../../src/modules/pos/stores/genesis';
import { SnapshotStore } from '../../../../src/modules/pos/stores/snapshot';
import { createStoreGetter } from '../../../../src/testing/utils';
import {
	COMMISSION_INCREASE_PERIOD,
	MAX_COMMISSION_INCREASE_RATE,
	TOKEN_ID_LENGTH,
	WEIGHT_SCALE_FACTOR,
} from '../../../../src/modules/pos/constants';
import { EligibleValidatorsStore } from '../../../../src/modules/pos/stores/eligible_validators';
import { getValidatorWeight, ValidatorWeight } from '../../../../src/modules/pos/utils';

describe('PoS module', () => {
	const EMPTY_KEY = Buffer.alloc(0);
	const defaultConfig = {
		factorSelfStakes: 10,
		maxLengthName: 20,
		maxNumberSentStakes: 10,
		maxNumberPendingUnlocks: 20,
		failSafeMissedBlocks: 50,
		failSafeInactiveWindow: 260000,
		punishmentWindow: 780000,
		roundLength: 103,
		minWeightStandby: (BigInt(1000) * BigInt(10 ** 8)).toString(),
		numberActiveValidators: 101,
		numberStandbyValidators: 2,
		posTokenID: '0000000000000000',
		validatorRegistrationFee: (BigInt(10) * BigInt(10) ** BigInt(8)).toString(),
		maxBFTWeightCap: 500,
		commissionIncreasePeriod: COMMISSION_INCREASE_PERIOD,
		maxCommissionIncreaseRate: MAX_COMMISSION_INCREASE_RATE,
		useInvalidBLSKey: false,
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

	let pos: PoSModule;
	beforeEach(() => {
		pos = new PoSModule();
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			await expect(
				pos.init({
					genesisConfig: { chainID: '00000000' } as any,
					moduleConfig: {},
				}),
			).resolves.toBeUndefined();

			expect(pos['_moduleConfig']).toEqual({
				...defaultConfig,
				minWeightStandby: BigInt(defaultConfig.minWeightStandby),
				posTokenID: Buffer.alloc(TOKEN_ID_LENGTH),
				validatorRegistrationFee: BigInt(defaultConfig.validatorRegistrationFee),
			});
		});

		it('should initialize config with given value', async () => {
			await expect(
				pos.init({
					genesisConfig: { chainID: '00000000' } as any,
					moduleConfig: { ...defaultConfig, maxLengthName: 50 },
				}),
			).toResolve();

			expect(pos['_moduleConfig'].maxLengthName).toBe(50);
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
				registerValidatorWithoutBLSKey: jest.fn().mockResolvedValue(true),
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
			const feeMethod = {
				payFee: jest.fn(),
			};
			pos.addDependencies(randomMethod, validatorMethod, tokenMethod, feeMethod);

			await pos.init({
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
					assets: new BlockAssets([{ module: pos.name, data: assetBytes }]),
				}).createInitGenesisStateContext();
				jest.spyOn(pos, 'finalizeGenesisState');

				await expect(pos.initGenesisState(context)).rejects.toThrow(errString as string);
				expect(pos.finalizeGenesisState).not.toHaveBeenCalled();
			});
		});

		describe('when the genesis asset is valid', () => {
			let genesisContext: GenesisBlockContext;
			let context: GenesisBlockExecuteContext;

			beforeEach(() => {
				const assetBytes = codec.encode(genesisStoreSchema, validAsset);
				genesisContext = createGenesisBlockContext({
					stateStore,
					assets: new BlockAssets([{ module: pos.name, data: assetBytes }]),
				});
				context = genesisContext.createInitGenesisStateContext();
			});

			it('should store self stake and received stakes', async () => {
				await expect(pos.initGenesisState(context)).resolves.toBeUndefined();
				await expect(pos.finalizeGenesisState(context)).toResolve();

				const validatorStore = pos.stores.get(ValidatorStore);
				await expect(validatorStore.get(context, validAsset.stakers[0].address)).resolves.toEqual({
					name: expect.any(String),
					consecutiveMissedBlocks: 0,
					isBanned: false,
					lastGeneratedHeight: 0,
					reportMisbehaviorHeights: [],
					selfStake: BigInt(100000000000),
					totalStake: BigInt(200000000000),
					commission: 0,
					lastCommissionIncreaseHeight: 0,
					sharingCoefficients: [],
				});
			});

			it('should store all the stakes', async () => {
				await expect(pos.initGenesisState(context)).toResolve();
				const stakerStore = pos.stores.get(StakerStore);
				expect.assertions(validAsset.stakers.length + 1);
				for (const staker of validAsset.stakers) {
					await expect(stakerStore.get(context, staker.address)).resolves.toEqual({
						stakes: staker.stakes,
						pendingUnlocks: staker.pendingUnlocks,
					});
				}
			});

			it('should store all the validators', async () => {
				await expect(pos.initGenesisState(context)).toResolve();
				const usernameStore = pos.stores.get(NameStore);
				const allNames = await usernameStore.iterate(context, {
					gte: Buffer.from([0]),
					lte: Buffer.from([255]),
				});
				expect(allNames).toHaveLength(validAsset.validators.length);

				const validatorStore = pos.stores.get(ValidatorStore);
				const allValidators = await validatorStore.iterate(context, {
					gte: Buffer.alloc(20, 0),
					lte: Buffer.alloc(20, 255),
				});
				expect(allValidators).toHaveLength(validAsset.validators.length);
			});

			it('should store previous timestamp', async () => {
				await expect(pos.initGenesisState(context)).toResolve();

				const previousTimestampStore = pos.stores.get(PreviousTimestampStore);
				await expect(previousTimestampStore.get(context, EMPTY_KEY)).resolves.toEqual({
					timestamp: context.header.timestamp,
				});
			});

			it('should store genesis data', async () => {
				await expect(pos.initGenesisState(context)).toResolve();

				const genesisDataStore = pos.stores.get(GenesisDataStore);
				await expect(genesisDataStore.get(context, EMPTY_KEY)).resolves.toEqual({
					height: context.header.height,
					initRounds: validAsset.genesisData.initRounds,
					initValidators: validAsset.genesisData.initValidators,
				});
			});

			it('should register all active validators as BFT validators', async () => {
				await expect(pos.initGenesisState(context)).toResolve();
				await expect(pos.finalizeGenesisState(context)).toResolve();

				expect(pos['_validatorsMethod'].setValidatorsParams).toHaveBeenCalledWith(
					expect.any(Object),
					expect.any(Object),
					BigInt(68),
					BigInt(68),
					validAsset.genesisData.initValidators.map(d => ({
						bftWeight: BigInt(1),
						address: d,
					})),
				);
			});

			it('should fail if registerValidatorKeys return false', async () => {
				(pos['_validatorsMethod'].registerValidatorKeys as jest.Mock).mockResolvedValue(false);

				await expect(pos.initGenesisState(context)).toResolve();
				await expect(pos.finalizeGenesisState(context)).rejects.toThrow('Invalid validator key');
			});

			it('should fail if getLockedAmount return different value', async () => {
				(pos['_tokenMethod'].getLockedAmount as jest.Mock).mockResolvedValue(BigInt(0));

				await expect(pos.initGenesisState(context)).toResolve();
				await expect(pos.finalizeGenesisState(context)).rejects.toThrow(
					'Staked amount is not locked',
				);
			});

			describe('when moduleConfig.useInvalidBLSKey is set to true and chain is mainchain', () => {
				beforeEach(async () => {
					await pos.init({
						genesisConfig: {} as GenesisConfig,
						moduleConfig: { ...defaultConfig, useInvalidBLSKey: true },
					});
				});

				it('should register validators without BLS key', async () => {
					const mainChainContext = { ...context, chainID: Buffer.from([0, 0, 0, 0]) };
					await expect(pos.initGenesisState(mainChainContext)).toResolve();
					await expect(pos.finalizeGenesisState(mainChainContext)).toResolve();

					expect(pos['_validatorsMethod'].registerValidatorWithoutBLSKey).toHaveBeenCalledTimes(
						validAsset.validators.length,
					);
				});
			});
		});
	});

	describe('_createStakeWeightSnapshot', () => {
		beforeEach(async () => {
			await pos.init({
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfig,
			});
		});

		describe('when all eligible validators are not punished', () => {
			const fixtures = forgerSelectionLessTHan103Scenario.testCases.input.validatorWeights;

			let context: BlockAfterExecuteContext;
			let stateStore: PrefixedStateReadWriter;

			beforeEach(async () => {
				stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
				const ctx = createTransientMethodContext({ stateStore });
				const genesisDataStore = pos.stores.get(GenesisDataStore);
				await genesisDataStore.set(ctx, EMPTY_KEY, {
					height: 0,
					initRounds: 3,
					initValidators: [],
				});
				const eligibleValidatorStore = pos.stores.get(EligibleValidatorsStore);
				for (const data of fixtures) {
					await eligibleValidatorStore.set(
						ctx,
						eligibleValidatorStore.getKey(
							Buffer.from(data.address, 'hex'),
							getValidatorWeight(
								BigInt(defaultConfig.factorSelfStakes),
								BigInt(data.validatorWeight),
								BigInt(data.validatorWeight),
							),
						),
						{ lastReportMisbehaviorHeight: 0 },
					);
				}
				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 1030 }),
				}).getBlockAfterExecuteContext();
			});

			it('should create a snapshot which include all validators', async () => {
				await pos['_createStakeWeightSnapshot'](context);

				const snapshotStore = pos.stores.get(SnapshotStore);
				const snapshot = await snapshotStore.get(context, utils.intToBuffer(11 + 2, 4));

				expect(snapshot.validatorWeightSnapshot).toHaveLength(fixtures.length);
			});
		});

		describe('when there are validators who are PoMed', () => {
			const fixtures = forgerSelectionMoreThan2StandByScenario.testCases.input.validatorWeights;

			let context: BlockAfterExecuteContext;
			let stateStore: PrefixedStateReadWriter;

			beforeEach(async () => {
				stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
				context = createBlockContext({
					stateStore,
					header: createFakeBlockHeader({ height: 1030000 }),
				}).getBlockAfterExecuteContext();
				const genesisDataStore = pos.stores.get(GenesisDataStore);
				await genesisDataStore.set(context, EMPTY_KEY, {
					height: 0,
					initRounds: 3,
					initValidators: [],
				});
				const eligibleValidatorStore = pos.stores.get(EligibleValidatorsStore);
				// set first validator banned
				await eligibleValidatorStore.set(
					context,
					eligibleValidatorStore.getKey(
						Buffer.from(fixtures[0].address, 'hex'),
						BigInt(fixtures[0].validatorWeight),
					),
					{
						lastReportMisbehaviorHeight: 1000,
					},
				);
				await eligibleValidatorStore.set(
					context,
					eligibleValidatorStore.getKey(
						Buffer.from(fixtures[1].address, 'hex'),
						BigInt(fixtures[1].validatorWeight),
					),
					{
						lastReportMisbehaviorHeight: 250001,
					},
				);
				await eligibleValidatorStore.set(
					context,
					eligibleValidatorStore.getKey(
						Buffer.from(fixtures[2].address, 'hex'),
						BigInt(fixtures[2].validatorWeight),
					),
					{
						lastReportMisbehaviorHeight: 250000,
					},
				);
				for (const data of fixtures.slice(3)) {
					await eligibleValidatorStore.set(
						context,
						eligibleValidatorStore.getKey(
							Buffer.from(data.address, 'hex'),
							BigInt(data.validatorWeight),
						),
						{
							lastReportMisbehaviorHeight: 0,
						},
					);
				}
				const snapshotStore = pos.stores.get(SnapshotStore);
				await snapshotStore.set(context, utils.intToBuffer(10000, 4), {
					validatorWeightSnapshot: [],
				});
				await snapshotStore.set(context, utils.intToBuffer(10001, 4), {
					validatorWeightSnapshot: [],
				});
				await snapshotStore.set(context, utils.intToBuffer(10002, 4), {
					validatorWeightSnapshot: [],
				});

				await pos['_createStakeWeightSnapshot'](context);
			});

			it('should create a snapshot which includes all validators who are not currently punished', async () => {
				const snapshotStore = pos.stores.get(SnapshotStore);
				const snapshot = await snapshotStore.get(context, utils.intToBuffer(10001 + 2, 4));

				// Remove punished validators
				expect(snapshot.validatorWeightSnapshot).toHaveLength(fixtures.length - 1);
			});

			it('should remove the snapshot older than 3 rounds', async () => {
				const snapshotStore = pos.stores.get(SnapshotStore);

				await expect(snapshotStore.has(context, utils.intToBuffer(10000, 4))).resolves.toBeFalse();
				await expect(snapshotStore.has(context, utils.intToBuffer(10001, 4))).resolves.toBeTrue();
				await expect(snapshotStore.has(context, utils.intToBuffer(10002, 4))).resolves.toBeTrue();
			});
		});
	});

	describe('_updateValidators', () => {
		beforeEach(async () => {
			await pos.init({
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
						// Forger selection relies on stake weight to be sorted
						const validators = [
							...scenario.testCases.input.validatorWeights.map(d => ({
								address: Buffer.from(d.address, 'hex'),
								weight: BigInt(d.validatorWeight),
							})),
						];
						sortValidatorsByWeightDesc(validators);
						const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
						const blockContext = createBlockContext({
							header: createFakeBlockHeader({
								height: (defaultRound - 1) * defaultConfig.roundLength,
							}),
							stateStore,
						});
						const context = blockContext.getBlockAfterExecuteContext();
						await pos.stores.get(GenesisDataStore).set(context, EMPTY_KEY, {
							height: 0,
							initRounds: 3,
							initValidators: [],
						});
						const snapshotStore = pos.stores.get(SnapshotStore);
						await snapshotStore.set(context, utils.intToBuffer(defaultRound, 4), {
							validatorWeightSnapshot: validators,
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
							registerValidatorWithoutBLSKey: jest.fn(),
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

						const feeMethod = {
							payFee: jest.fn(),
						};

						pos.addDependencies(randomMethod, validatorMethod, tokenMethod, feeMethod);

						await pos['_updateValidators'](context);

						expect(validatorMethod.setValidatorsParams).toHaveBeenCalledTimes(1);
					});
				});
			}
		});

		describe('when there are exactly 103 eligible validators', () => {
			const defaultRound = 123;
			let validatorMethod: ValidatorsMethod;
			let blockContext: BlockContext;

			const scenario = forgerSelectionTwoStandbyScenario;

			beforeEach(async () => {
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);

				const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
				blockContext = createBlockContext({
					header: createFakeBlockHeader({
						height: (defaultRound - 1) * defaultConfig.roundLength,
					}),
					stateStore,
				});
				await pos.stores
					.get(GenesisDataStore)
					.set(blockContext.getBlockExecuteContext(), EMPTY_KEY, {
						height: 0,
						initRounds: 3,
						initValidators: [],
					});
				const snapshotStore = pos.stores.get(SnapshotStore);
				await snapshotStore.set(
					blockContext.getBlockExecuteContext(),
					utils.intToBuffer(defaultRound, 4),
					{
						validatorWeightSnapshot: validators,
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
					registerValidatorWithoutBLSKey: jest.fn(),
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

				const feeMethod = {
					payFee: jest.fn(),
				};

				pos.addDependencies(randomMethod, validatorMethod, tokenMethod, feeMethod);

				await pos['_updateValidators'](blockContext.getBlockAfterExecuteContext());
			});

			it('should have activeValidators + standbyValidators validators in the generators list', () => {
				expect((validatorMethod.setValidatorsParams as jest.Mock).mock.calls[0][4]).toHaveLength(
					defaultConfig.roundLength,
				);
			});

			it('should have standbyValidators BFTWeight as zero', () => {
				const standbyValidators = (
					validatorMethod.setValidatorsParams as jest.Mock
				).mock.calls[0][4].filter((v: any) => v.bftWeight === BigInt(0));
				expect(standbyValidators).toHaveLength(2);
			});
		});

		describe('when there are enough standby validators', () => {
			const defaultRound = 123;
			let validatorMethod: ValidatorsMethod;
			let blockContext: BlockContext;

			const scenario = forgerSelectionMoreThan2StandByScenario;

			beforeEach(async () => {
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);

				const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
				blockContext = createBlockContext({
					header: createFakeBlockHeader({
						height: (defaultRound - 1) * defaultConfig.roundLength,
					}),
					stateStore,
				});
				await pos.stores
					.get(GenesisDataStore)
					.set(blockContext.getBlockExecuteContext(), EMPTY_KEY, {
						height: 0,
						initRounds: 3,
						initValidators: [],
					});
				const snapshotStore = pos.stores.get(SnapshotStore);
				await snapshotStore.set(
					blockContext.getBlockExecuteContext(),
					utils.intToBuffer(defaultRound, 4),
					{
						validatorWeightSnapshot: validators,
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
					registerValidatorWithoutBLSKey: jest.fn(),
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

				const feeMethod = {
					payFee: jest.fn(),
				};

				pos.addDependencies(randomMethod, validatorMethod, tokenMethod, feeMethod);

				await pos['_updateValidators'](blockContext.getBlockAfterExecuteContext());
			});

			it('should have activeValidators + standbyValidators validators in the generators list', () => {
				expect((validatorMethod.setValidatorsParams as jest.Mock).mock.calls[0][4]).toHaveLength(
					defaultConfig.roundLength,
				);
			});

			it('should store selected stand by validators in the generators list', () => {
				const { selectedForgers } = scenario.testCases.output;
				const standbyValidatorsInFixture = [
					Buffer.from(selectedForgers[selectedForgers.length - 1], 'hex'),
					Buffer.from(selectedForgers[selectedForgers.length - 2], 'hex'),
				].sort((a, b) => a.compare(b));

				const updatedValidators = (validatorMethod.setValidatorsParams as jest.Mock).mock
					.calls[0][4] as Validator[];
				const standbyCandidates = updatedValidators
					.filter(
						validator =>
							standbyValidatorsInFixture.find(fixture => fixture.equals(validator.address)) !==
							undefined,
					)
					.sort((a, b) => a.address.compare(b.address));

				expect(standbyCandidates).toHaveLength(2);
				expect(standbyCandidates.map(v => v.address)).toEqual(standbyValidatorsInFixture);
				expect(standbyCandidates.every(v => v.bftWeight === BigInt(0))).toBeTrue();
			});
		});
	});

	describe('_updateProductivity', () => {
		const randomMethod: any = {};
		const tokenMethod: any = {};
		const feeMethod: any = {};

		let validatorsMethod: any;
		let stateStore: PrefixedStateReadWriter;
		let validatorData: ValidatorAccount[];
		let validatorAddresses: Buffer[];
		let previousTimestampStore: PreviousTimestampStore;
		let validatorStore: ValidatorStore;

		beforeEach(async () => {
			await pos.init({
				genesisConfig: {
					chainID: '00000000',
				} as GenesisConfig,
				moduleConfig: defaultConfig,
			});

			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

			validatorsMethod = {
				getGeneratorsBetweenTimestamps: jest.fn(),
			};

			pos.addDependencies(randomMethod, validatorsMethod, tokenMethod, feeMethod);

			validatorData = Array(103)
				.fill({})
				.map((_, index) => ({
					name: `validator${index}`,
					totalStake: BigInt(0),
					selfStake: BigInt(0),
					lastGeneratedHeight: 0,
					isBanned: false,
					reportMisbehaviorHeights: [],
					consecutiveMissedBlocks: 0,
					commission: 0,
					lastCommissionIncreaseHeight: 0,
					sharingCoefficients: [
						{ tokenID: Buffer.alloc(TOKEN_ID_LENGTH), coefficient: Buffer.alloc(24) },
					],
				}));
			validatorAddresses = Array.from({ length: 103 }, _ => utils.getRandomBytes(20));

			previousTimestampStore = pos.stores.get(PreviousTimestampStore);
			validatorStore = pos.stores.get(ValidatorStore);
			const genesisDataStore = pos.stores.get(GenesisDataStore);
			await genesisDataStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 0,
				initRounds: 3,
				initValidators: [],
			});

			for (let i = 0; i < 103; i += 1) {
				await validatorStore.set(
					createStoreGetter(stateStore),
					validatorAddresses[i],
					validatorData[i],
				);
			}
		});
		describe('When only 1 validator forged since last block', () => {
			it('should increment "consecutiveMissedBlocks" for every forgers except forging validator', async () => {
				const generatorAddress = validatorAddresses[validatorAddresses.length - 1];
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
				// Make every validator miss its block-slot except gte and end slots
				for (let i = 0; i < 102; i += 1) {
					missedBlocks[validatorAddresses[i].toString('binary')] = 1;
				}

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				await pos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(validatorAddresses.length + 1);
				for (const validatorAddress of validatorAddresses) {
					const currentValidator = await validatorStore.get(
						createStoreGetter(stateStore),
						validatorAddress,
					);
					if (validatorAddress.equals(generatorAddress)) {
						expect(currentValidator.consecutiveMissedBlocks).toBe(0);
						expect(currentValidator.lastGeneratedHeight).toBe(nextForgedHeight);
					} else {
						expect(currentValidator.consecutiveMissedBlocks).toBe(1);
					}
				}
			});
		});

		describe('When only 2 validator missed a block since last block', () => {
			it('should increment "consecutiveMissedBlocks" only for forgers who missed a block', async () => {
				const generatorAddress = validatorAddresses[validatorAddresses.length - 1];
				const missedForgers = [
					validatorAddresses[validatorAddresses.length - 2],
					validatorAddresses[validatorAddresses.length - 3],
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

				await pos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(validatorAddresses.length);
				for (const validatorAddress of validatorAddresses) {
					const currentValidator = await validatorStore.get(
						createStoreGetter(stateStore),
						validatorAddress,
					);
					if (missedForgers.some(missedForger => missedForger.equals(validatorAddress))) {
						expect(currentValidator.consecutiveMissedBlocks).toBe(1);
					} else {
						expect(currentValidator.consecutiveMissedBlocks).toBe(0);
					}
				}
			});
		});

		describe('When validator missed more than 1 blocks since last block', () => {
			it('should increment "consecutiveMissedBlocks"  for the number of blocks that validator missed', async () => {
				const generatorIndex = validatorAddresses.length - 1;
				const generatorAddress = validatorAddresses[generatorIndex];
				const missedMoreThan1Block = validatorAddresses.slice(generatorIndex - 5, generatorIndex);
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
				for (const validatorAddress of validatorAddresses) {
					missedBlocks[validatorAddress.toString('binary')] = 1;
				}
				for (const validatorAddress of missedMoreThan1Block) {
					missedBlocks[validatorAddress.toString('binary')] += 1;
				}

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				await pos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(validatorAddresses.length);
				for (const validatorAddress of validatorAddresses) {
					const currentValidator = await validatorStore.get(
						createStoreGetter(stateStore),
						validatorAddress,
					);
					if (missedMoreThan1Block.some(missedForger => missedForger.equals(validatorAddress))) {
						expect(currentValidator.consecutiveMissedBlocks).toBe(2);
					} else if (validatorAddress.equals(generatorAddress)) {
						expect(currentValidator.consecutiveMissedBlocks).toBe(0);
					} else {
						expect(currentValidator.consecutiveMissedBlocks).toBe(1);
					}
				}
			});
		});

		describe('When all validators successfully forges a block', () => {
			it('must NOT update "consecutiveMissedBlocks" for anyone', async () => {
				const generatorIndex = validatorAddresses.length - 1;
				const generatorAddress = validatorAddresses[generatorIndex];
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

				await pos['_updateProductivity'](context, previousTimestamp);

				expect.assertions(validatorAddresses.length + 1);
				for (const validatorAddress of validatorAddresses) {
					const currentValidator = await validatorStore.get(
						createStoreGetter(stateStore),
						validatorAddress,
					);
					expect(currentValidator.consecutiveMissedBlocks).toBe(0);
					if (validatorAddress.equals(generatorAddress)) {
						expect(currentValidator.lastGeneratedHeight).toBe(nextForgedHeight);
					}
				}
			});
		});

		describe('when forger missed a block has 50 consecutive missed block, but forged within 260k blocks', () => {
			it('should not ban the missed forger', async () => {
				const generatorIndex = validatorAddresses.length - 1;
				const missedValidatorIndex = generatorIndex - 1;
				const generatorAddress = validatorAddresses[generatorIndex];
				const missedValidator = validatorAddresses[missedValidatorIndex];
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
				missedBlocks[missedValidator.toString('binary')] = 1;

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				validatorData[missedValidatorIndex].consecutiveMissedBlocks = 50;
				validatorData[missedValidatorIndex].lastGeneratedHeight = nextForgedHeight - 260000 + 5000;

				await validatorStore.set(
					createStoreGetter(stateStore),
					missedValidator,
					validatorData[missedValidatorIndex],
				);

				await pos['_updateProductivity'](context, previousTimestamp);

				const currentValidator = await validatorStore.get(
					createStoreGetter(stateStore),
					missedValidator,
				);
				expect(currentValidator.isBanned).toBeFalse();
				expect(currentValidator.consecutiveMissedBlocks).toBe(51);
			});
		});

		describe('when forger missed a block has not forged within 260k blocks, but does not have 50 consecutive missed block', () => {
			it('should not ban the missed forger', async () => {
				const generatorIndex = validatorAddresses.length - 1;
				const missedValidatorIndex = generatorIndex - 1;
				const generatorAddress = validatorAddresses[generatorIndex];
				const missedValidator = validatorAddresses[missedValidatorIndex];
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
				missedBlocks[missedValidator.toString('binary')] = 1;

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				validatorData[missedValidatorIndex].consecutiveMissedBlocks = 40;
				validatorData[missedValidatorIndex].lastGeneratedHeight = nextForgedHeight - 260000 - 1;

				await validatorStore.set(
					createStoreGetter(stateStore),
					missedValidator,
					validatorData[missedValidatorIndex],
				);

				await pos['_updateProductivity'](context, previousTimestamp);

				const currentValidator = await validatorStore.get(
					createStoreGetter(stateStore),
					missedValidator,
				);
				expect(currentValidator.isBanned).toBeFalse();
				expect(currentValidator.consecutiveMissedBlocks).toBe(41);
			});
		});

		describe('when forger missed a block has 50 consecutive missed block, and not forged within 260k blocks', () => {
			it('should ban the missed forger', async () => {
				const generatorIndex = validatorAddresses.length - 1;
				const missedValidatorIndex = generatorIndex - 1;
				const generatorAddress = validatorAddresses[generatorIndex];
				const missedValidator = validatorAddresses[missedValidatorIndex];
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
				missedBlocks[missedValidator.toString('binary')] = 1;

				when(validatorsMethod.getGeneratorsBetweenTimestamps)
					.calledWith(context.getMethodContext(), previousTimestamp, currentTimestamp)
					.mockReturnValue(missedBlocks);

				validatorData[missedValidatorIndex].consecutiveMissedBlocks = 50;
				validatorData[missedValidatorIndex].lastGeneratedHeight = nextForgedHeight - 260000 - 1;

				await validatorStore.set(
					createStoreGetter(stateStore),
					missedValidator,
					validatorData[missedValidatorIndex],
				);

				await pos['_updateProductivity'](context, previousTimestamp);

				const currentValidator = await validatorStore.get(
					createStoreGetter(stateStore),
					missedValidator,
				);
				expect(currentValidator.isBanned).toBeTrue();
				expect(currentValidator.consecutiveMissedBlocks).toBe(51);
			});
		});
	});

	describe('_getActiveValidators', () => {
		let stateStore: PrefixedStateReadWriter;
		let context: BlockAfterExecuteContext;

		const scenario = forgerSelectionMoreThan2StandByScenario;
		const initValidators = new Array(101).fill(0).map(() => utils.getRandomBytes(20));

		beforeEach(async () => {
			await pos.init({
				genesisConfig: {} as GenesisConfig,
				moduleConfig: defaultConfig,
			});

			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			await pos.stores.get(GenesisDataStore).set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 0,
				initRounds: 3,
				initValidators,
			});
			jest.spyOn(pos, '_capWeight' as never);
		});

		describe('when current round is less than initRounds + numberOfActiveValidators', () => {
			it('should select init validators for initRounds + numberOfActiveValidators - round', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);

				const result = await pos['_getActiveValidators'](context, validators, 6);
				expect(result).toHaveLength(defaultConfig.numberActiveValidators);
				const fromInitValidators = result.filter(
					v => initValidators.findIndex(address => v.address.equals(address)) > -1,
				);
				expect(fromInitValidators).toHaveLength(3 + defaultConfig.numberActiveValidators - 6);
			});

			it('should select init validators with weight 1 if there are no active validators selected', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();

				const result = await pos['_getActiveValidators'](context, [], 6);

				expect(result).toHaveLength(defaultConfig.numberActiveValidators - 3);
				expect(result.every(v => v.weight === BigInt(1))).toBeTrue();
			});

			it('should not select the same validator twice', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);
				// Overwrite the snapshot validator address to be the one in init validators
				const [duplicateAddress] = initValidators;
				validators[0].address = duplicateAddress;

				const result = await pos['_getActiveValidators'](context, validators, 6);

				expect(result).toHaveLength(defaultConfig.numberActiveValidators);
				const duplicateAddressList = result.filter(v => v.address.equals(initValidators[0]));
				expect(duplicateAddressList).toHaveLength(1);
			});

			it('should not select from init validators when there is not enough snapshot validators', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				].slice(scenario.testCases.input.validatorWeights.length - 1);
				sortValidatorsByWeightDesc(validators);

				// Overwrite the snapshot validator address to be the one in init validators
				const [duplicateAddress] = initValidators;
				validators[0].address = duplicateAddress;

				const result = await pos['_getActiveValidators'](context, validators, 6);

				expect(result).toHaveLength(defaultConfig.numberActiveValidators - 2);
			});

			it('should set averageWeight for initValidators', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);

				const result = await pos['_getActiveValidators'](context, validators, 6);
				expect(result).toHaveLength(defaultConfig.numberActiveValidators);
				const notFromInitValidators = result.filter(
					v => initValidators.findIndex(address => v.address.equals(address)) === -1,
				);
				const fromInitValidators = result.filter(
					v => initValidators.findIndex(address => v.address.equals(address)) > -1,
				);
				const average =
					notFromInitValidators.reduce((prev, curr) => prev + curr.weight, BigInt(0)) /
					BigInt(notFromInitValidators.length);
				expect(fromInitValidators.every(v => v.weight === average)).toBeTrue();
			});

			it('should cap the weight if activeValidators is more than capValue', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);

				await pos['_getActiveValidators'](context, validators, 6);
				expect(pos['_capWeight']).toHaveBeenCalledWith(
					expect.any(Array),
					defaultConfig.maxBFTWeightCap,
				);
			});

			it('should scale BFT weight', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);

				const result = await pos['_getActiveValidators'](context, validators, 6);
				expect(result).toHaveLength(defaultConfig.numberActiveValidators);
				const notFromInitValidators = result.filter(
					v => initValidators.findIndex(address => v.address.equals(address)) === -1,
				);
				expect(notFromInitValidators.every(v => v.weight <= WEIGHT_SCALE_FACTOR)).toBeTrue();
			});
		});

		describe('when current round is more than initRounds + numberOfActiveValidators', () => {
			it('should select all snapshotValidators if snapshotValidators is less than numberOfActiveValidators', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				].slice(0, 10);
				sortValidatorsByWeightDesc(validators);

				const result = await pos['_getActiveValidators'](context, validators, 104);
				expect(result).toHaveLength(10);
				expect(pos['_capWeight']).not.toHaveBeenCalled();
			});

			it('should select numberOfActiveValidators if snapshotValidators is longer', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);

				const result = await pos['_getActiveValidators'](context, validators, 104);
				expect(result).toHaveLength(defaultConfig.numberActiveValidators);
			});

			it('should cap the weight if activeValidators is more than capValue', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);

				await pos['_getActiveValidators'](context, validators, 104);
				expect(pos['_capWeight']).toHaveBeenCalledWith(
					expect.any(Array),
					defaultConfig.maxBFTWeightCap,
				);
			});

			it('should scale BFT weight', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);

				const result = await pos['_getActiveValidators'](context, validators, 104);
				expect(pos['_capWeight']).toHaveBeenCalledWith(
					expect.any(Array),
					defaultConfig.maxBFTWeightCap,
				);
				const notFromInitValidators = result.filter(
					v => initValidators.findIndex(address => v.address.equals(address)) === -1,
				);
				expect(notFromInitValidators.every(v => v.weight <= WEIGHT_SCALE_FACTOR)).toBeTrue();
			});
		});

		describe('when current round is equal to initRounds + numberOfActiveValidators', () => {
			it('should select active validators from the snapshot', async () => {
				context = createBlockContext({
					stateStore,
				}).getBlockAfterExecuteContext();
				// Forger selection relies on stake weight to be sorted
				const validators: { address: Buffer; weight: bigint }[] = [
					...scenario.testCases.input.validatorWeights.map(d => ({
						address: Buffer.from(d.address, 'hex'),
						weight: BigInt(d.validatorWeight),
					})),
				];
				sortValidatorsByWeightDesc(validators);

				const result = await pos['_getActiveValidators'](context, validators, 104);
				expect(result).toHaveLength(defaultConfig.numberActiveValidators);
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
				pos['_capWeight'](c.validators, c.capValue);
				expect(c.validators).toEqual(c.expectedValidators);
			}
		});
	});

	describe('afterTransactionsExecute', () => {
		const genesisData: GenesisData = {
			height: 0,
			initRounds: 3,
			initValidators: [],
		};
		const bootstrapRounds = genesisData.initRounds;

		const randomMethod: any = {};
		const tokenMethod: any = {};
		const validatorsMethod: any = {};
		const feeMethod: any = {};

		let stateStore: PrefixedStateReadWriter;
		let height: number;
		let context: BlockAfterExecuteContext;
		let previousTimestampStore: PreviousTimestampStore;
		let currentTimestamp: number;
		let previousTimestamp: number;
		let genesisDataStore: GenesisDataStore;

		beforeEach(async () => {
			await pos.init({
				genesisConfig: {
					chainID: '00000000',
				} as GenesisConfig,
				moduleConfig: defaultConfig,
			});
			pos.addDependencies(randomMethod, validatorsMethod, tokenMethod, feeMethod);

			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

			previousTimestampStore = pos.stores.get(PreviousTimestampStore);
			genesisDataStore = pos.stores.get(GenesisDataStore);

			await genesisDataStore.set(
				createTransientMethodContext({ stateStore }),
				EMPTY_KEY,
				genesisData,
			);

			jest.spyOn(pos as any, '_createStakeWeightSnapshot').mockImplementation();
			jest.spyOn(pos as any, '_updateProductivity').mockImplementation();
			jest.spyOn(pos as any, '_updateValidators').mockImplementation();
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

				await pos.afterTransactionsExecute(context);
			});

			it('should create stake weight snapshot', () => {
				expect(pos['_createStakeWeightSnapshot']).toHaveBeenCalledTimes(1);
				expect(pos['_createStakeWeightSnapshot']).toHaveBeenCalledWith(context);
			});

			it('should update validators', () => {
				expect(pos['_updateValidators']).toHaveBeenCalledTimes(1);
				expect(pos['_updateValidators']).toHaveBeenCalledWith(context);
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

				await pos.afterTransactionsExecute(context);
			});

			it('should not create stake weight snapshot', () => {
				expect(pos['_createStakeWeightSnapshot']).toHaveBeenCalledTimes(0);
			});

			it('should not update validators', () => {
				expect(pos['_updateValidators']).toHaveBeenCalledTimes(0);
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

				await pos.afterTransactionsExecute(context);
			});

			it('should create stake weight snapshot', () => {
				expect(pos['_createStakeWeightSnapshot']).toHaveBeenCalledTimes(1);
				expect(pos['_createStakeWeightSnapshot']).toHaveBeenCalledWith(context);
			});

			it('should update validators', () => {
				expect(pos['_updateValidators']).toHaveBeenCalledTimes(1);
				expect(pos['_updateValidators']).toHaveBeenCalledWith(context);
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

				await pos.afterTransactionsExecute(context);
			});

			it('should create stake weight snapshot', () => {
				expect(pos['_createStakeWeightSnapshot']).toHaveBeenCalledTimes(1);
				expect(pos['_createStakeWeightSnapshot']).toHaveBeenCalledWith(context);
			});

			it('should not update validators', () => {
				expect(pos['_updateValidators']).toHaveBeenCalledTimes(0);
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

				await pos.afterTransactionsExecute(context);
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
