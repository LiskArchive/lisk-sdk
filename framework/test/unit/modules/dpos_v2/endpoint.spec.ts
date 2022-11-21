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
	PUNISHMENT_WINDOW_VOTES,
	LOCKING_PERIOD_SELF_VOTES,
	LOCKING_PERIOD_VOTES,
} from '../../../../src/modules/dpos_v2/constants';
import { DPoSEndpoint } from '../../../../src/modules/dpos_v2/endpoint';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import {
	ModuleConfig,
	VoterData,
	VoteSharingCoefficient,
} from '../../../../src/modules/dpos_v2/types';
import { DPoSModule } from '../../../../src';
import { VoterStore, voterStoreSchema } from '../../../../src/modules/dpos_v2/stores/voter';
import { DelegateStore } from '../../../../src/modules/dpos_v2/stores/delegate';
import { createStoreGetter } from '../../../../src/testing/utils';
import {
	createFakeBlockHeader,
	createTransientModuleEndpointContext,
} from '../../../../src/testing';
import { GenesisDataStore } from '../../../../src/modules/dpos_v2/stores/genesis';
import { EligibleDelegatesStore } from '../../../../src/modules/dpos_v2/stores/eligible_delegates';
import { calculateVoteRewards } from '../../../../src/modules/dpos_v2/utils';

const { q96 } = math;

describe('DposModuleEndpoint', () => {
	const dpos = new DPoSModule();

	let dposEndpoint: DPoSEndpoint;
	let stateStore: PrefixedStateReadWriter;
	let voterSubStore: VoterStore;
	let delegateSubStore: DelegateStore;
	let genesisSubStore: GenesisDataStore;
	let eligibleDelegatesSubStore: EligibleDelegatesStore;

	const address = utils.getRandomBytes(20);
	const address1 = utils.getRandomBytes(20);
	const address2 = utils.getRandomBytes(20);

	const addressVoter = utils.getRandomBytes(20);
	const voterData: VoterData = {
		sentVotes: [
			{
				delegateAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
				voteSharingCoefficients: [],
			},
		],
		pendingUnlocks: [
			{
				delegateAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
				unvoteHeight: 0,
			},
		],
	};

	const token1 = Buffer.from('1000000000000010', 'hex');
	const token2 = Buffer.from('1000000000000020', 'hex');
	const voterCoefficient1 = q96(2).toBuffer();
	const voterCoefficient2 = q96(5).toBuffer();
	const delegateCoefficient1 = q96(3).toBuffer();
	const delegateCoefficient2 = q96(6).toBuffer();

	const voterSharingCoefficient1: VoteSharingCoefficient = {
		tokenID: token1,
		coefficient: voterCoefficient1,
	};
	const voterSharingCoefficient2: VoteSharingCoefficient = {
		tokenID: token2,
		coefficient: voterCoefficient2,
	};
	const delegateSharingCoefficient1: VoteSharingCoefficient = {
		tokenID: token1,
		coefficient: delegateCoefficient1,
	};
	const delegateSharingCoefficient2: VoteSharingCoefficient = {
		tokenID: token2,
		coefficient: delegateCoefficient2,
	};

	const delegateData = {
		name: 'delegate1',
		totalVotesReceived: BigInt(0),
		selfVotes: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [0],
		consecutiveMissedBlocks: 0,
		address: cryptoAddress.getLisk32AddressFromAddress(address),
		commission: 0,
		lastCommissionIncreaseHeight: 0,
		sharingCoefficients: [delegateSharingCoefficient1, delegateSharingCoefficient2],
	};

	const config: ModuleConfig = {
		...defaultConfig,
		minWeightStandby: BigInt(defaultConfig.minWeightStandby),
		governanceTokenID: Buffer.from('1000000000000002', 'hex'),
		tokenIDFee: Buffer.from(defaultConfig.tokenIDFee, 'hex'),
		delegateRegistrationFee: BigInt(defaultConfig.delegateRegistrationFee),
	};

	beforeEach(() => {
		dposEndpoint = new DPoSEndpoint(dpos.stores, dpos.offchainStores);
		dposEndpoint.init('dpos', config, {
			getAvailableBalance: jest.fn(),
			getLockedAmount: jest.fn(),
			burn: jest.fn(),
			lock: jest.fn(),
			transfer: jest.fn(),
			unlock: jest.fn(),
		});
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		voterSubStore = dpos.stores.get(VoterStore);
		delegateSubStore = dpos.stores.get(DelegateStore);
		genesisSubStore = dpos.stores.get(GenesisDataStore);
		eligibleDelegatesSubStore = dpos.stores.get(EligibleDelegatesStore);
	});

	describe('getVoter', () => {
		describe('when input address is valid', () => {
			it('should return correct voter data corresponding to the input address', async () => {
				await voterSubStore.set(createStoreGetter(stateStore), address, voterData);
				const voterDataReturned = await dposEndpoint.getVoter(
					createTransientModuleEndpointContext({
						stateStore,
						params: {
							address: cryptoAddress.getLisk32AddressFromAddress(address),
						},
					}),
				);

				expect(voterDataReturned).toStrictEqual(codec.toJSON(voterStoreSchema, voterData));
			});

			it('should return valid JSON output', async () => {
				await voterSubStore.set(createStoreGetter(stateStore), address, voterData);
				const voterDataReturned = await dposEndpoint.getVoter(
					createTransientModuleEndpointContext({
						stateStore,
						params: {
							address: cryptoAddress.getLisk32AddressFromAddress(address),
						},
					}),
				);

				expect(voterDataReturned.sentVotes[0].delegateAddress).toBeString();
				expect(voterDataReturned.sentVotes[0].amount).toBeString();
				expect(voterDataReturned.pendingUnlocks[0].delegateAddress).toBeString();
				expect(voterDataReturned.pendingUnlocks[0].amount).toBeString();
			});
		});
	});

	describe('getDelegate', () => {
		describe('when input address is valid', () => {
			it('should return correct delegate data corresponding to the input address', async () => {
				await delegateSubStore.set(createStoreGetter(stateStore), address, delegateData);
				const delegateDataReturned = await dposEndpoint.getDelegate(
					createTransientModuleEndpointContext({
						stateStore,
						params: {
							address: cryptoAddress.getLisk32AddressFromAddress(address),
						},
					}),
				);

				const delegateDataJSON = {
					...delegateData,
					totalVotesReceived: delegateData.totalVotesReceived.toString(),
					selfVotes: delegateData.selfVotes.toString(),
					address: cryptoAddress.getLisk32AddressFromAddress(address),
					sharingCoefficients: [
						{
							tokenID: token1.toString('hex'),
							coefficient: delegateCoefficient1.toString('hex'),
						},
						{
							tokenID: token2.toString('hex'),
							coefficient: delegateCoefficient2.toString('hex'),
						},
					],
				};

				expect(delegateDataReturned).toStrictEqual(delegateDataJSON);
			});

			it('should return valid JSON output', async () => {
				await delegateSubStore.set(createStoreGetter(stateStore), address, delegateData);
				const delegateDataReturned = await dposEndpoint.getDelegate(
					createTransientModuleEndpointContext({
						stateStore,
						params: {
							address: cryptoAddress.getLisk32AddressFromAddress(address),
						},
					}),
				);

				expect(delegateDataReturned.totalVotesReceived).toBeString();
				expect(delegateDataReturned.selfVotes).toBeString();
			});
		});
	});

	describe('getAllDelegates', () => {
		describe('when input address is valid', () => {
			const address1Str = cryptoAddress.getLisk32AddressFromAddress(address1);
			const address2Str = cryptoAddress.getLisk32AddressFromAddress(address2);

			const addresses = [address1Str, address2Str];

			const delegateData1 = Object.assign(delegateData, { address: address1Str });
			const delegateData2 = Object.assign(delegateData, { address: address2Str });

			// CAUTION!
			// getAllDelegates() returns data in random order
			it('should return correct data for all delegates', async () => {
				await delegateSubStore.set(createStoreGetter(stateStore), address1, delegateData1);
				await delegateSubStore.set(createStoreGetter(stateStore), address2, delegateData2);
				const { delegates: delegatesDataReturned } = await dposEndpoint.getAllDelegates(
					createTransientModuleEndpointContext({ stateStore }),
				);

				expect(addresses).toContain(delegatesDataReturned[0].address);
				expect(addresses).toContain(delegatesDataReturned[1].address);
			});

			it('should return valid JSON output', async () => {
				await delegateSubStore.set(createStoreGetter(stateStore), address, delegateData1);
				await delegateSubStore.set(createStoreGetter(stateStore), address1, delegateData2);
				const { delegates: delegatesDataReturned } = await dposEndpoint.getAllDelegates(
					createTransientModuleEndpointContext({ stateStore }),
				);

				expect(delegatesDataReturned[0].totalVotesReceived).toBeString();
				expect(delegatesDataReturned[0].selfVotes).toBeString();
				expect(delegatesDataReturned[1].totalVotesReceived).toBeString();
				expect(delegatesDataReturned[1].selfVotes).toBeString();
			});
		});
	});

	describe('getLockedVotedAmount', () => {
		beforeEach(async () => {
			const context = createStoreGetter(stateStore);
			await voterSubStore.set(context, address, {
				sentVotes: [
					{ delegateAddress: address1, amount: BigInt(200), voteSharingCoefficients: [] },
					{ delegateAddress: address2, amount: BigInt(10), voteSharingCoefficients: [] },
				],
				pendingUnlocks: [{ amount: BigInt(30), delegateAddress: address1, unvoteHeight: 99 }],
			});
		});

		it('should reject with invalid params', async () => {
			await expect(
				dposEndpoint.getLockedVotedAmount(
					createTransientModuleEndpointContext({ stateStore, params: { address: true } }),
				),
			).rejects.toThrow('Lisk validator found 1 error[s]:');
		});

		it('should return amount locked for votes', async () => {
			const resp = await dposEndpoint.getLockedVotedAmount(
				createTransientModuleEndpointContext({
					stateStore,
					params: { address: cryptoAddress.getLisk32AddressFromAddress(address) },
				}),
			);
			expect(resp.amount).toEqual(Number(200 + 10 + 30).toString());
		});
	});

	describe('getConstants', () => {
		it('should return DPoSModule configuration', async () => {
			const constants = await dposEndpoint.getConstants();

			expect(constants).toStrictEqual({
				...defaultConfig,
				governanceTokenID: config.governanceTokenID.toString('hex'),
			});
		});
	});

	describe('getPendingUnlocks', () => {
		it('should reject if input address is invalid', async () => {
			await expect(
				dposEndpoint.getPendingUnlocks(
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
				dposEndpoint.getPendingUnlocks(
					createTransientModuleEndpointContext({
						params: {
							address: 'lskos7tnf5jx4e6jq400000000000000000000000',
						},
					}),
				),
			).rejects.toThrow('Invalid character found in address');
		});

		it('should return empty if voter does not exist', async () => {
			await expect(
				dposEndpoint.getPendingUnlocks(
					createTransientModuleEndpointContext({
						params: {
							address: 'lskos7tnf5jx4e6jq4bf5z4gwo2ow5he4khn75gpo',
						},
					}),
				),
			).resolves.toEqual({ pendingUnlocks: [] });
		});

		it('should return return all pending unlocks with expected unlockable heights', async () => {
			await delegateSubStore.set(createStoreGetter(stateStore), address, {
				...delegateData,
				name: 'delegate',
				pomHeights: [],
			});
			await delegateSubStore.set(createStoreGetter(stateStore), address1, {
				...delegateData,
				name: 'delegate1',
				pomHeights: [],
			});
			const pomHeight = 260000;
			await delegateSubStore.set(createStoreGetter(stateStore), address2, {
				...delegateData,
				name: 'delegate2',
				pomHeights: [pomHeight],
			});
			const pendingUnlocks = [
				{
					amount: BigInt(200),
					delegateAddress: address,
					unvoteHeight: 100000,
				},
				{
					amount: BigInt(200),
					delegateAddress: address1,
					unvoteHeight: 300000,
				},
				{
					amount: BigInt(500),
					delegateAddress: address2,
					unvoteHeight: 250000,
				},
			];
			await voterSubStore.set(createStoreGetter(stateStore), address, {
				sentVotes: [],
				pendingUnlocks,
			});
			await genesisSubStore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 0,
				initDelegates: [],
				initRounds: 3,
			});

			await expect(
				dposEndpoint.getPendingUnlocks(
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
						delegateAddress: cryptoAddress.getLisk32AddressFromAddress(
							pendingUnlocks[0].delegateAddress,
						),
						amount: pendingUnlocks[0].amount.toString(),
						unlockable: true,
						expectedUnlockableHeight: pendingUnlocks[0].unvoteHeight + LOCKING_PERIOD_SELF_VOTES,
					},
					{
						...pendingUnlocks[1],
						delegateAddress: cryptoAddress.getLisk32AddressFromAddress(
							pendingUnlocks[1].delegateAddress,
						),
						amount: pendingUnlocks[1].amount.toString(),
						unlockable: false,
						expectedUnlockableHeight: pendingUnlocks[1].unvoteHeight + LOCKING_PERIOD_VOTES,
					},
					{
						...pendingUnlocks[2],
						delegateAddress: cryptoAddress.getLisk32AddressFromAddress(
							pendingUnlocks[2].delegateAddress,
						),
						amount: pendingUnlocks[2].amount.toString(),
						unlockable: false,
						expectedUnlockableHeight: pomHeight + PUNISHMENT_WINDOW_VOTES,
					},
				],
			});
		});
	});

	describe('getGovernanceTokenID', () => {
		it('should return governanceTokenID', async () => {
			await expect(
				dposEndpoint.getGovernanceTokenID(createTransientModuleEndpointContext({ stateStore })),
			).resolves.toEqual({
				tokenID: config.governanceTokenID.toString('hex'),
			});
		});
	});

	describe('getValidatorsByStake', () => {
		beforeEach(async () => {
			const context = createStoreGetter(stateStore);
			await eligibleDelegatesSubStore.set(
				context,
				eligibleDelegatesSubStore.getKey(address, BigInt(20)),
				{ lastPomHeight: 0 },
			);
			await eligibleDelegatesSubStore.set(
				context,
				eligibleDelegatesSubStore.getKey(address1, BigInt(50)),
				{ lastPomHeight: 0 },
			);
			await eligibleDelegatesSubStore.set(
				context,
				eligibleDelegatesSubStore.getKey(address2, BigInt(100)),
				{ lastPomHeight: 0 },
			);

			await delegateSubStore.set(context, address, {
				...delegateData,
				name: '1',
			});
			await delegateSubStore.set(context, address1, {
				...delegateData,
				name: '2',
			});
			await delegateSubStore.set(context, address2, {
				...delegateData,
				name: '3',
			});
		});

		it('should reject with invalid params', async () => {
			await expect(
				dposEndpoint.getValidatorsByStake(
					createTransientModuleEndpointContext({ stateStore, params: { limit: true } }),
				),
			).rejects.toThrow('Lisk validator found 1 error[s]:');
		});

		it('should return validators with default limit', async () => {
			const resp = await dposEndpoint.getValidatorsByStake(
				createTransientModuleEndpointContext({ stateStore }),
			);
			expect(resp.validators).toHaveLength(3);
			expect(resp.validators[0]).toEqual({
				...delegateData,
				name: '3',
				totalVotesReceived: delegateData.totalVotesReceived.toString(),
				selfVotes: delegateData.selfVotes.toString(),
				sharingCoefficients: delegateData.sharingCoefficients.map(co => ({
					tokenID: co.tokenID.toString('hex'),
					coefficient: co.coefficient.toString('hex'),
				})),
			});
		});

		it('should return all validators with limit', async () => {
			const resp = await dposEndpoint.getValidatorsByStake(
				createTransientModuleEndpointContext({ stateStore, params: { limit: 2 } }),
			);
			expect(resp.validators).toHaveLength(2);
			expect(resp.validators[0]).toEqual({
				...delegateData,
				name: '3',
				address: cryptoAddress.getLisk32AddressFromAddress(address2),
				totalVotesReceived: delegateData.totalVotesReceived.toString(),
				selfVotes: delegateData.selfVotes.toString(),
				sharingCoefficients: delegateData.sharingCoefficients.map(co => ({
					tokenID: co.tokenID.toString('hex'),
					coefficient: co.coefficient.toString('hex'),
				})),
			});
			expect(resp.validators[1]).toEqual({
				...delegateData,
				address: cryptoAddress.getLisk32AddressFromAddress(address1),
				name: '2',
				totalVotesReceived: delegateData.totalVotesReceived.toString(),
				selfVotes: delegateData.selfVotes.toString(),
				sharingCoefficients: delegateData.sharingCoefficients.map(co => ({
					tokenID: co.tokenID.toString('hex'),
					coefficient: co.coefficient.toString('hex'),
				})),
			});
		});
	});

	describe('getLockedRewards', () => {
		beforeEach(async () => {
			const context = createStoreGetter(stateStore);
			await voterSubStore.set(context, address, {
				sentVotes: [
					{ delegateAddress: address1, amount: BigInt(200), voteSharingCoefficients: [] },
					{ delegateAddress: address2, amount: BigInt(10), voteSharingCoefficients: [] },
				],
				pendingUnlocks: [{ amount: BigInt(30), delegateAddress: address1, unvoteHeight: 99 }],
			});

			(dposEndpoint['_tokenMethod'].getLockedAmount as jest.Mock).mockResolvedValue(BigInt(5000));
		});

		it('should reject with invalid params', async () => {
			await expect(
				dposEndpoint.getLockedRewards(
					createTransientModuleEndpointContext({ stateStore, params: { limit: true } }),
				),
			).rejects.toThrow('Lisk validator found 2 error[s]:');
		});

		it('should reject with invalid token ID params', async () => {
			await expect(
				dposEndpoint.getLockedRewards(
					createTransientModuleEndpointContext({
						stateStore,
						params: { address: cryptoAddress.getLisk32AddressFromAddress(address), tokenID: 123 },
					}),
				),
			).rejects.toThrow('Lisk validator found 1 error[s]:');
		});

		it('should return full amount when token ID requested is not governance tokenID', async () => {
			const resp = await dposEndpoint.getLockedRewards(
				createTransientModuleEndpointContext({
					stateStore,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address),
						tokenID: Buffer.alloc(8).toString('hex'),
					},
				}),
			);
			expect(resp.reward).toEqual('5000');
		});

		it('should return amount without the amount locked for votes with token ID requested is the governance token ID', async () => {
			const resp = await dposEndpoint.getLockedRewards(
				createTransientModuleEndpointContext({
					stateStore,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address),
						tokenID: config.governanceTokenID.toString('hex'),
					},
				}),
			);
			expect(resp.reward).toEqual(Number(5000 - 200 - 10 - 30).toString());
		});
	});

	describe('getClaimableRewards', () => {
		it('should return rewards when voted for 1 delegate which got rewards in 2 tokens', async () => {
			const amount = BigInt(200);
			const context = createStoreGetter(stateStore);
			await delegateSubStore.set(context, address, delegateData);
			await voterSubStore.set(context, addressVoter, {
				sentVotes: [
					{
						delegateAddress: address,
						amount,
						voteSharingCoefficients: [voterSharingCoefficient1, voterSharingCoefficient2],
					},
				],
				pendingUnlocks: [],
			});

			const response = await dposEndpoint.getClaimableRewards(
				createTransientModuleEndpointContext({
					stateStore,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(addressVoter),
					},
				}),
			);

			expect(response.rewards).toHaveLength(2);
			expect(response).toEqual({
				rewards: [
					{
						tokenID: voterSharingCoefficient1.tokenID.toString('hex'),
						reward: calculateVoteRewards(
							voterSharingCoefficient1,
							amount,
							delegateSharingCoefficient1,
						).toString(),
					},
					{
						tokenID: voterSharingCoefficient2.tokenID.toString('hex'),
						reward: calculateVoteRewards(
							voterSharingCoefficient2,
							amount,
							delegateSharingCoefficient2,
						).toString(),
					},
				],
			});
		});

		it('should exclude self vote from the claimable rewards', async () => {
			const amount = BigInt(200);
			const context = createStoreGetter(stateStore);
			await delegateSubStore.set(context, address, delegateData);
			await voterSubStore.set(context, address, {
				sentVotes: [
					{
						delegateAddress: address,
						amount,
						voteSharingCoefficients: [voterSharingCoefficient1, voterSharingCoefficient2],
					},
				],
				pendingUnlocks: [],
			});

			const response = await dposEndpoint.getClaimableRewards(
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
