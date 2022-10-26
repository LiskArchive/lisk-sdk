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
import { Logger } from '../../../../src/logger';
import { defaultConfig } from '../../../../src/modules/dpos_v2/constants';
import { DPoSEndpoint } from '../../../../src/modules/dpos_v2/endpoint';
import { fakeLogger } from '../../../utils/mocks';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { ModuleConfig } from '../../../../src/modules/dpos_v2/types';
import { DPoSModule } from '../../../../src';
import { VoterStore, voterStoreSchema } from '../../../../src/modules/dpos_v2/stores/voter';
import { DelegateStore } from '../../../../src/modules/dpos_v2/stores/delegate';
import { createStoreGetter } from '../../../../src/testing/utils';

describe('DposModuleEndpoint', () => {
	const dpos = new DPoSModule();

	const logger: Logger = fakeLogger;
	let dposEndpoint: DPoSEndpoint;
	let stateStore: PrefixedStateReadWriter;
	let voterSubStore: VoterStore;
	let delegateSubStore: DelegateStore;

	const address = utils.getRandomBytes(20);
	const address1 = utils.getRandomBytes(20);
	const address2 = utils.getRandomBytes(20);
	const chainID = Buffer.alloc(0);
	const voterData = {
		sentVotes: [
			{
				delegateAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
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
	};

	const config: ModuleConfig = {
		...defaultConfig,
		minWeightStandby: BigInt(defaultConfig.minWeightStandby),
		tokenIDDPoS: Buffer.from(defaultConfig.tokenIDDPoS, 'hex'),
	};

	beforeEach(() => {
		dposEndpoint = new DPoSEndpoint(dpos.stores, dpos.offchainStores);
		dposEndpoint.init(config);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		voterSubStore = dpos.stores.get(VoterStore);
		delegateSubStore = dpos.stores.get(DelegateStore);
	});

	describe('getVoter', () => {
		describe('when input address is valid', () => {
			it('should return correct voter data corresponding to the input address', async () => {
				await voterSubStore.set(createStoreGetter(stateStore), address, voterData);
				const voterDataReturned = await dposEndpoint.getVoter({
					getStore: (p1, p2) => stateStore.getStore(p1, p2),
					getImmutableMethodContext: jest.fn(),
					logger,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address),
					},
					chainID,
					getOffchainStore: jest.fn(),
				});

				expect(voterDataReturned).toStrictEqual(codec.toJSON(voterStoreSchema, voterData));
			});

			it('should return valid JSON output', async () => {
				await voterSubStore.set(createStoreGetter(stateStore), address, voterData);
				const voterDataReturned = await dposEndpoint.getVoter({
					getStore: (p1, p2) => stateStore.getStore(p1, p2),
					getImmutableMethodContext: jest.fn(),
					logger,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address),
					},
					chainID,
					getOffchainStore: jest.fn(),
				});

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
				const delegateDataReturned = await dposEndpoint.getDelegate({
					getStore: (p1, p2) => stateStore.getStore(p1, p2),
					getImmutableMethodContext: jest.fn(),
					logger,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address),
					},
					chainID,
					getOffchainStore: jest.fn(),
				});

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
				const delegateDataReturned = await dposEndpoint.getDelegate({
					getStore: (p1, p2) => stateStore.getStore(p1, p2),
					getImmutableMethodContext: jest.fn(),
					logger,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address),
					},
					chainID,
					getOffchainStore: jest.fn(),
				});

				expect(delegateDataReturned.totalVotesReceived).toBeString();
				expect(delegateDataReturned.selfVotes).toBeString();
			});
		});
	});

	describe('getAllDelegates', () => {
		describe('when input address is valid', () => {
			const address1Str = address1.toString('hex');
			const address2Str = address2.toString('hex');

			const addresses = [address1Str, address2Str];

			const delegateData1 = Object.assign(delegateData, { address: address1Str });
			const delegateData2 = Object.assign(delegateData, { address: address2Str });

			// CAUTION!
			// getAllDelegates() returns data in random order
			it('should return correct data for all delegates', async () => {
				await delegateSubStore.set(createStoreGetter(stateStore), address1, delegateData1);
				await delegateSubStore.set(createStoreGetter(stateStore), address2, delegateData2);
				const { delegates: delegatesDataReturned } = await dposEndpoint.getAllDelegates({
					getStore: (p1, p2) => stateStore.getStore(p1, p2),
					getImmutableMethodContext: jest.fn(),
					logger,
					params: {},
					chainID,
					getOffchainStore: jest.fn(),
				});

				expect(addresses).toContain(delegatesDataReturned[0].address);
				expect(addresses).toContain(delegatesDataReturned[1].address);
			});

			it('should return valid JSON output', async () => {
				await delegateSubStore.set(createStoreGetter(stateStore), address, delegateData1);
				await delegateSubStore.set(createStoreGetter(stateStore), address1, delegateData2);
				const { delegates: delegatesDataReturned } = await dposEndpoint.getAllDelegates({
					getStore: (p1, p2) => stateStore.getStore(p1, p2),
					getImmutableMethodContext: jest.fn(),
					logger,
					params: {},
					chainID,
					getOffchainStore: jest.fn(),
				});

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
});
