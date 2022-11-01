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
import {
	defaultConfig,
	EMPTY_KEY,
	VOTER_PUNISH_TIME,
	WAIT_TIME_SELF_VOTE,
	WAIT_TIME_VOTE,
} from '../../../../src/modules/dpos_v2/constants';
import { DPoSEndpoint } from '../../../../src/modules/dpos_v2/endpoint';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { ModuleConfig } from '../../../../src/modules/dpos_v2/types';
import { DPoSModule } from '../../../../src';
import {
	VoterData,
	VoterStore,
	voterStoreSchema,
} from '../../../../src/modules/dpos_v2/stores/voter';
import { DelegateStore } from '../../../../src/modules/dpos_v2/stores/delegate';
import { createStoreGetter } from '../../../../src/testing/utils';
import {
	createFakeBlockHeader,
	createTransientModuleEndpointContext,
} from '../../../../src/testing';
import { GenesisDataStore } from '../../../../src/modules/dpos_v2/stores/genesis';

describe('DposModuleEndpoint', () => {
	const dpos = new DPoSModule();

	let dposEndpoint: DPoSEndpoint;
	let stateStore: PrefixedStateReadWriter;
	let voterSubStore: VoterStore;
	let delegateSubStore: DelegateStore;
	let genesisSubStore: GenesisDataStore;

	const address = utils.getRandomBytes(20);
	const address1 = utils.getRandomBytes(20);
	const address2 = utils.getRandomBytes(20);
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
		sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
	};

	const config: ModuleConfig = {
		...defaultConfig,
		minWeightStandby: BigInt(defaultConfig.minWeightStandby),
		tokenIDDPoS: Buffer.from(defaultConfig.tokenIDDPoS, 'hex'),
		tokenIDFee: Buffer.from(defaultConfig.tokenIDFee, 'hex'),
	};

	beforeEach(() => {
		dposEndpoint = new DPoSEndpoint(dpos.stores, dpos.offchainStores);
		dposEndpoint.init(config);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		voterSubStore = dpos.stores.get(VoterStore);
		delegateSubStore = dpos.stores.get(DelegateStore);
		genesisSubStore = dpos.stores.get(GenesisDataStore);
	});

	describe.skip('getVoter', () => {
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

	describe('getConstants', () => {
		it('should return DPoSModule configuration', async () => {
			const constants = await dposEndpoint.getConstants();

			expect(constants).toStrictEqual(defaultConfig);
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
						expectedUnlockableHeight: pendingUnlocks[0].unvoteHeight + WAIT_TIME_SELF_VOTE,
					},
					{
						...pendingUnlocks[1],
						delegateAddress: cryptoAddress.getLisk32AddressFromAddress(
							pendingUnlocks[1].delegateAddress,
						),
						amount: pendingUnlocks[1].amount.toString(),
						unlockable: false,
						expectedUnlockableHeight: pendingUnlocks[1].unvoteHeight + WAIT_TIME_VOTE,
					},
					{
						...pendingUnlocks[2],
						delegateAddress: cryptoAddress.getLisk32AddressFromAddress(
							pendingUnlocks[2].delegateAddress,
						),
						amount: pendingUnlocks[2].amount.toString(),
						unlockable: false,
						expectedUnlockableHeight: pomHeight + VOTER_PUNISH_TIME,
					},
				],
			});
		});
	});
});
