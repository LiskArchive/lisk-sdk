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

import { address as cryptoAddress, utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { math } from '@liskhq/lisk-utils';
import {
	defaultConfig,
	EMPTY_KEY,
	PUNISHMENT_WINDOW_STAKES,
	LOCKING_PERIOD_SELF_STAKES,
	LOCKING_PERIOD_STAKES,
} from '../../../../src/modules/pos/constants';
import { PoSEndpoint } from '../../../../src/modules/pos/endpoint';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import {
	ModuleConfig,
	StakerData,
	StakeSharingCoefficient,
} from '../../../../src/modules/pos/types';
import { PoSModule } from '../../../../src';
import { StakerStore, stakerStoreSchema } from '../../../../src/modules/pos/stores/staker';
import { ValidatorStore } from '../../../../src/modules/pos/stores/validator';
import { createStoreGetter } from '../../../../src/testing/utils';
import {
	createFakeBlockHeader,
	createTransientModuleEndpointContext,
} from '../../../../src/testing';
import { GenesisDataStore } from '../../../../src/modules/pos/stores/genesis';
import { EligibleValidatorsStore } from '../../../../src/modules/pos/stores/eligible_validators';
import { calculateStakeRewards } from '../../../../src/modules/pos/utils';

const { q96 } = math;

describe('PosModuleEndpoint', () => {
	const pos = new PoSModule();

	let posEndpoint: PoSEndpoint;
	let stateStore: PrefixedStateReadWriter;
	let stakerSubStore: StakerStore;
	let validatorSubStore: ValidatorStore;
	let genesisSubStore: GenesisDataStore;
	let eligibleValidatorsSubStore: EligibleValidatorsStore;

	const address = utils.getRandomBytes(20);
	const address1 = utils.getRandomBytes(20);
	const address2 = utils.getRandomBytes(20);

	const addressStaker = utils.getRandomBytes(20);
	const stakerData: StakerData = {
		sentStakes: [
			{
				validatorAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
				stakeSharingCoefficients: [],
			},
		],
		pendingUnlocks: [
			{
				validatorAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
				unstakeHeight: 0,
			},
		],
	};

	const token1 = Buffer.from('1000000000000010', 'hex');
	const token2 = Buffer.from('1000000000000020', 'hex');
	const stakerCoefficient1 = q96(2).toBuffer();
	const stakerCoefficient2 = q96(5).toBuffer();
	const validatorCoefficient1 = q96(3).toBuffer();
	const validatorCoefficient2 = q96(6).toBuffer();

	const stakerSharingCoefficient1: StakeSharingCoefficient = {
		tokenID: token1,
		coefficient: stakerCoefficient1,
	};
	const stakerSharingCoefficient2: StakeSharingCoefficient = {
		tokenID: token2,
		coefficient: stakerCoefficient2,
	};
	const validatorSharingCoefficient1: StakeSharingCoefficient = {
		tokenID: token1,
		coefficient: validatorCoefficient1,
	};
	const validatorSharingCoefficient2: StakeSharingCoefficient = {
		tokenID: token2,
		coefficient: validatorCoefficient2,
	};

	const validatorData = {
		name: 'validator1',
		totalStakeReceived: BigInt(0),
		selfStake: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [0],
		consecutiveMissedBlocks: 0,
		address: cryptoAddress.getLisk32AddressFromAddress(address),
		commission: 0,
		lastCommissionIncreaseHeight: 0,
		sharingCoefficients: [validatorSharingCoefficient1, validatorSharingCoefficient2],
	};

	const config: ModuleConfig = {
		...defaultConfig,
		minWeightStandby: BigInt(defaultConfig.minWeightStandby),
		posTokenID: Buffer.from('1000000000000002', 'hex'),
		validatorRegistrationFee: BigInt(defaultConfig.validatorRegistrationFee),
	};

	beforeEach(() => {
		posEndpoint = new PoSEndpoint(pos.stores, pos.offchainStores);
		posEndpoint.init('pos', config, {
			getAvailableBalance: jest.fn(),
			getLockedAmount: jest.fn(),
			burn: jest.fn(),
			lock: jest.fn(),
			transfer: jest.fn(),
			unlock: jest.fn(),
		});
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		stakerSubStore = pos.stores.get(StakerStore);
		validatorSubStore = pos.stores.get(ValidatorStore);
		genesisSubStore = pos.stores.get(GenesisDataStore);
		eligibleValidatorsSubStore = pos.stores.get(EligibleValidatorsStore);
	});

	describe('getStaker', () => {
		describe('when input address is valid', () => {
			it('should return correct staker data corresponding to the input address', async () => {
				await stakerSubStore.set(createStoreGetter(stateStore), address, stakerData);
				const stakerDataReturned = await posEndpoint.getStaker(
					createTransientModuleEndpointContext({
						stateStore,
						params: {
							address: cryptoAddress.getLisk32AddressFromAddress(address),
						},
					}),
				);

				expect(stakerDataReturned).toStrictEqual(codec.toJSON(stakerStoreSchema, stakerData));
			});

			it('should return valid JSON output', async () => {
				await stakerSubStore.set(createStoreGetter(stateStore), address, stakerData);
				const stakerDataReturned = await posEndpoint.getStaker(
					createTransientModuleEndpointContext({
						stateStore,
						params: {
							address: cryptoAddress.getLisk32AddressFromAddress(address),
						},
					}),
				);

				expect(stakerDataReturned.sentStakes[0].validatorAddress).toBeString();
				expect(stakerDataReturned.sentStakes[0].amount).toBeString();
				expect(stakerDataReturned.pendingUnlocks[0].validatorAddress).toBeString();
				expect(stakerDataReturned.pendingUnlocks[0].amount).toBeString();
			});
		});
	});

	describe('getValidator', () => {
		describe('when input address is valid', () => {
			it('should return correct validator data corresponding to the input address', async () => {
				await validatorSubStore.set(createStoreGetter(stateStore), address, validatorData);
				const validatorDataReturned = await posEndpoint.getValidator(
					createTransientModuleEndpointContext({
						stateStore,
						params: {
							address: cryptoAddress.getLisk32AddressFromAddress(address),
						},
					}),
				);

				const validatorDataJSON = {
					...validatorData,
					totalStakeReceived: validatorData.totalStakeReceived.toString(),
					selfStake: validatorData.selfStake.toString(),
					address: cryptoAddress.getLisk32AddressFromAddress(address),
					sharingCoefficients: [
						{
							tokenID: token1.toString('hex'),
							coefficient: validatorCoefficient1.toString('hex'),
						},
						{
							tokenID: token2.toString('hex'),
							coefficient: validatorCoefficient2.toString('hex'),
						},
					],
				};

				expect(validatorDataReturned).toStrictEqual(validatorDataJSON);
			});

			it('should return valid JSON output', async () => {
				await validatorSubStore.set(createStoreGetter(stateStore), address, validatorData);
				const validatorDataReturned = await posEndpoint.getValidator(
					createTransientModuleEndpointContext({
						stateStore,
						params: {
							address: cryptoAddress.getLisk32AddressFromAddress(address),
						},
					}),
				);

				expect(validatorDataReturned.totalStakeReceived).toBeString();
				expect(validatorDataReturned.selfStake).toBeString();
			});
		});
	});

	describe('getAllValidators', () => {
		describe('when input address is valid', () => {
			const address1Str = cryptoAddress.getLisk32AddressFromAddress(address1);
			const address2Str = cryptoAddress.getLisk32AddressFromAddress(address2);

			const addresses = [address1Str, address2Str];

			const validatorData1 = Object.assign(validatorData, { address: address1Str });
			const validatorData2 = Object.assign(validatorData, { address: address2Str });

			// CAUTION!
			// getAllValidators() returns data in random order
			it('should return correct data for all validators', async () => {
				await validatorSubStore.set(createStoreGetter(stateStore), address1, validatorData1);
				await validatorSubStore.set(createStoreGetter(stateStore), address2, validatorData2);
				const { validators: validatorsDataReturned } = await posEndpoint.getAllValidators(
					createTransientModuleEndpointContext({ stateStore }),
				);

				expect(addresses).toContain(validatorsDataReturned[0].address);
				expect(addresses).toContain(validatorsDataReturned[1].address);
			});

			it('should return valid JSON output', async () => {
				await validatorSubStore.set(createStoreGetter(stateStore), address, validatorData1);
				await validatorSubStore.set(createStoreGetter(stateStore), address1, validatorData2);
				const { validators: validatorsDataReturned } = await posEndpoint.getAllValidators(
					createTransientModuleEndpointContext({ stateStore }),
				);

				expect(validatorsDataReturned[0].totalStakeReceived).toBeString();
				expect(validatorsDataReturned[0].selfStake).toBeString();
				expect(validatorsDataReturned[1].totalStakeReceived).toBeString();
				expect(validatorsDataReturned[1].selfStake).toBeString();
			});
		});
	});

	describe('getLockedStakedAmount', () => {
		beforeEach(async () => {
			const context = createStoreGetter(stateStore);
			await stakerSubStore.set(context, address, {
				sentStakes: [
					{ validatorAddress: address1, amount: BigInt(200), stakeSharingCoefficients: [] },
					{ validatorAddress: address2, amount: BigInt(10), stakeSharingCoefficients: [] },
				],
				pendingUnlocks: [{ amount: BigInt(30), validatorAddress: address1, unstakeHeight: 99 }],
			});
		});

		it('should reject with invalid params', async () => {
			await expect(
				posEndpoint.getLockedStakedAmount(
					createTransientModuleEndpointContext({ stateStore, params: { address: true } }),
				),
			).rejects.toThrow('Lisk validator found 1 error[s]:');
		});

		it('should return amount locked for stakes', async () => {
			const resp = await posEndpoint.getLockedStakedAmount(
				createTransientModuleEndpointContext({
					stateStore,
					params: { address: cryptoAddress.getLisk32AddressFromAddress(address) },
				}),
			);
			expect(resp.amount).toEqual(Number(200 + 10 + 30).toString());
		});
	});

	describe('getConstants', () => {
		it('should return PoSModule configuration', async () => {
			const constants = await posEndpoint.getConstants();

			expect(constants).toStrictEqual({
				...defaultConfig,
				posTokenID: config.posTokenID.toString('hex'),
			});
		});
	});

	describe('getPendingUnlocks', () => {
		it('should reject if input address is invalid', async () => {
			await expect(
				posEndpoint.getPendingUnlocks(
					createTransientModuleEndpointContext({
						params: {
							address: 1,
						},
					}),
				),
			).rejects.toThrow('Parameter address must be a string');
		});

		it('should reject if input address is not lisk32 format', async () => {
			await expect(
				posEndpoint.getPendingUnlocks(
					createTransientModuleEndpointContext({
						params: {
							address: 'lskos7tnf5jx4e6jq400000000000000000000000',
						},
					}),
				),
			).rejects.toThrow('Invalid character found in address');
		});

		it('should return empty if staker does not exist', async () => {
			await expect(
				posEndpoint.getPendingUnlocks(
					createTransientModuleEndpointContext({
						params: {
							address: 'lskos7tnf5jx4e6jq4bf5z4gwo2ow5he4khn75gpo',
						},
					}),
				),
			).resolves.toEqual({ pendingUnlocks: [] });
		});

		it('should return return all pending unlocks with expected unlockable heights', async () => {
			await validatorSubStore.set(createStoreGetter(stateStore), address, {
				...validatorData,
				name: 'validator',
				pomHeights: [],
			});
			await validatorSubStore.set(createStoreGetter(stateStore), address1, {
				...validatorData,
				name: 'validator1',
				pomHeights: [],
			});
			const pomHeight = 260000;
			await validatorSubStore.set(createStoreGetter(stateStore), address2, {
				...validatorData,
				name: 'validator2',
				pomHeights: [pomHeight],
			});
			const pendingUnlocks = [
				{
					amount: BigInt(200),
					validatorAddress: address,
					unstakeHeight: 100000,
				},
				{
					amount: BigInt(200),
					validatorAddress: address1,
					unstakeHeight: 300000,
				},
				{
					amount: BigInt(500),
					validatorAddress: address2,
					unstakeHeight: 250000,
				},
			];
			await stakerSubStore.set(createStoreGetter(stateStore), address, {
				sentStakes: [],
				pendingUnlocks,
			});
			await genesisSubStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 0,
				initValidators: [],
				initRounds: 3,
			});

			await expect(
				posEndpoint.getPendingUnlocks(
					createTransientModuleEndpointContext({
						stateStore,
						context: {
							header: createFakeBlockHeader({
								height: 1000000,
								timestamp: 100000,
								aggregateCommit: {
									aggregationBits: Buffer.alloc(0),
									certificateSignature: Buffer.alloc(0),
									height: 250000,
								},
							}),
						},
						params: {
							address: cryptoAddress.getLisk32AddressFromAddress(address),
						},
					}),
				),
			).resolves.toEqual({
				pendingUnlocks: [
					{
						...pendingUnlocks[0],
						validatorAddress: cryptoAddress.getLisk32AddressFromAddress(
							pendingUnlocks[0].validatorAddress,
						),
						amount: pendingUnlocks[0].amount.toString(),
						unlockable: true,
						expectedUnlockableHeight: pendingUnlocks[0].unstakeHeight + LOCKING_PERIOD_SELF_STAKES,
					},
					{
						...pendingUnlocks[1],
						validatorAddress: cryptoAddress.getLisk32AddressFromAddress(
							pendingUnlocks[1].validatorAddress,
						),
						amount: pendingUnlocks[1].amount.toString(),
						unlockable: false,
						expectedUnlockableHeight: pendingUnlocks[1].unstakeHeight + LOCKING_PERIOD_STAKES,
					},
					{
						...pendingUnlocks[2],
						validatorAddress: cryptoAddress.getLisk32AddressFromAddress(
							pendingUnlocks[2].validatorAddress,
						),
						amount: pendingUnlocks[2].amount.toString(),
						unlockable: false,
						expectedUnlockableHeight: pomHeight + PUNISHMENT_WINDOW_STAKES,
					},
				],
			});
		});
	});

	describe('getPoSTokenID', () => {
		it('should return posTokenID', async () => {
			await expect(
				posEndpoint.getPoSTokenID(createTransientModuleEndpointContext({ stateStore })),
			).resolves.toEqual({
				tokenID: config.posTokenID.toString('hex'),
			});
		});
	});

	describe('getValidatorsByStake', () => {
		beforeEach(async () => {
			const context = createStoreGetter(stateStore);
			await eligibleValidatorsSubStore.set(
				context,
				eligibleValidatorsSubStore.getKey(address, BigInt(20)),
				{ lastPomHeight: 0 },
			);
			await eligibleValidatorsSubStore.set(
				context,
				eligibleValidatorsSubStore.getKey(address1, BigInt(50)),
				{ lastPomHeight: 0 },
			);
			await eligibleValidatorsSubStore.set(
				context,
				eligibleValidatorsSubStore.getKey(address2, BigInt(100)),
				{ lastPomHeight: 0 },
			);

			await validatorSubStore.set(context, address, {
				...validatorData,
				name: '1',
			});
			await validatorSubStore.set(context, address1, {
				...validatorData,
				name: '2',
			});
			await validatorSubStore.set(context, address2, {
				...validatorData,
				name: '3',
			});
		});

		it('should reject with invalid params', async () => {
			await expect(
				posEndpoint.getValidatorsByStake(
					createTransientModuleEndpointContext({ stateStore, params: { limit: true } }),
				),
			).rejects.toThrow('Lisk validator found 1 error[s]:');
		});

		it('should return validators with default limit', async () => {
			const resp = await posEndpoint.getValidatorsByStake(
				createTransientModuleEndpointContext({ stateStore }),
			);
			expect(resp.validators).toHaveLength(3);
			expect(resp.validators[0]).toEqual({
				...validatorData,
				name: '3',
				totalStakeReceived: validatorData.totalStakeReceived.toString(),
				selfStake: validatorData.selfStake.toString(),
				sharingCoefficients: validatorData.sharingCoefficients.map(co => ({
					tokenID: co.tokenID.toString('hex'),
					coefficient: co.coefficient.toString('hex'),
				})),
			});
		});

		it('should return all validators with limit', async () => {
			const resp = await posEndpoint.getValidatorsByStake(
				createTransientModuleEndpointContext({ stateStore, params: { limit: 2 } }),
			);
			expect(resp.validators).toHaveLength(2);
			expect(resp.validators[0]).toEqual({
				...validatorData,
				name: '3',
				address: cryptoAddress.getLisk32AddressFromAddress(address2),
				totalStakeReceived: validatorData.totalStakeReceived.toString(),
				selfStake: validatorData.selfStake.toString(),
				sharingCoefficients: validatorData.sharingCoefficients.map(co => ({
					tokenID: co.tokenID.toString('hex'),
					coefficient: co.coefficient.toString('hex'),
				})),
			});
			expect(resp.validators[1]).toEqual({
				...validatorData,
				address: cryptoAddress.getLisk32AddressFromAddress(address1),
				name: '2',
				totalStakeReceived: validatorData.totalStakeReceived.toString(),
				selfStake: validatorData.selfStake.toString(),
				sharingCoefficients: validatorData.sharingCoefficients.map(co => ({
					tokenID: co.tokenID.toString('hex'),
					coefficient: co.coefficient.toString('hex'),
				})),
			});
		});
	});

	describe('getLockedReward', () => {
		beforeEach(async () => {
			const context = createStoreGetter(stateStore);
			await stakerSubStore.set(context, address, {
				sentStakes: [
					{ validatorAddress: address1, amount: BigInt(200), stakeSharingCoefficients: [] },
					{ validatorAddress: address2, amount: BigInt(10), stakeSharingCoefficients: [] },
				],
				pendingUnlocks: [{ amount: BigInt(30), validatorAddress: address1, unstakeHeight: 99 }],
			});

			(posEndpoint['_tokenMethod'].getLockedAmount as jest.Mock).mockResolvedValue(BigInt(5000));
		});

		it('should reject with invalid params', async () => {
			await expect(
				posEndpoint.getLockedReward(
					createTransientModuleEndpointContext({ stateStore, params: { limit: true } }),
				),
			).rejects.toThrow('Lisk validator found 2 error[s]:');
		});

		it('should reject with invalid token ID params', async () => {
			await expect(
				posEndpoint.getLockedReward(
					createTransientModuleEndpointContext({
						stateStore,
						params: { address: cryptoAddress.getLisk32AddressFromAddress(address), tokenID: 123 },
					}),
				),
			).rejects.toThrow('Lisk validator found 1 error[s]:');
		});

		it('should return full amount when token ID requested is not governance tokenID', async () => {
			const resp = await posEndpoint.getLockedReward(
				createTransientModuleEndpointContext({
					stateStore,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address),
						tokenID: Buffer.alloc(8).toString('hex'),
					},
				}),
			);
			expect(resp.reward).toBe('5000');
		});

		it('should return amount without the amount locked for stakes with token ID requested is the governance token ID', async () => {
			const resp = await posEndpoint.getLockedReward(
				createTransientModuleEndpointContext({
					stateStore,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address),
						tokenID: config.posTokenID.toString('hex'),
					},
				}),
			);
			expect(resp.reward).toEqual(Number(5000 - 200 - 10 - 30).toString());
		});
	});

	describe('getClaimableRewards', () => {
		it('should return rewards when staked for 1 validator which got rewards in 2 tokens', async () => {
			const amount = BigInt(200);
			const context = createStoreGetter(stateStore);
			await validatorSubStore.set(context, address, validatorData);
			await stakerSubStore.set(context, addressStaker, {
				sentStakes: [
					{
						validatorAddress: address,
						amount,
						stakeSharingCoefficients: [stakerSharingCoefficient1, stakerSharingCoefficient2],
					},
				],
				pendingUnlocks: [],
			});

			const response = await posEndpoint.getClaimableRewards(
				createTransientModuleEndpointContext({
					stateStore,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(addressStaker),
					},
				}),
			);

			expect(response.rewards).toHaveLength(2);
			expect(response).toEqual({
				rewards: [
					{
						tokenID: stakerSharingCoefficient1.tokenID.toString('hex'),
						reward: calculateStakeRewards(
							stakerSharingCoefficient1,
							amount,
							validatorSharingCoefficient1,
						).toString(),
					},
					{
						tokenID: stakerSharingCoefficient2.tokenID.toString('hex'),
						reward: calculateStakeRewards(
							stakerSharingCoefficient2,
							amount,
							validatorSharingCoefficient2,
						).toString(),
					},
				],
			});
		});

		it('should exclude self stake from the claimable rewards', async () => {
			const amount = BigInt(200);
			const context = createStoreGetter(stateStore);
			await validatorSubStore.set(context, address, validatorData);
			await stakerSubStore.set(context, address, {
				sentStakes: [
					{
						validatorAddress: address,
						amount,
						stakeSharingCoefficients: [stakerSharingCoefficient1, stakerSharingCoefficient2],
					},
				],
				pendingUnlocks: [],
			});

			const response = await posEndpoint.getClaimableRewards(
				createTransientModuleEndpointContext({
					stateStore,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address),
					},
				}),
			);

			expect(response).toEqual({ rewards: [] });
		});
	});
});
