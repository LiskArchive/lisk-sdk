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

import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { Logger } from '../../../../src/logger';
import {
	MODULE_ID_DPOS_BUFFER,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_VOTER,
	defaultConfig,
} from '../../../../src/modules/dpos_v2/constants';
import { DPoSEndpoint } from '../../../../src/modules/dpos_v2/endpoint';
import { delegateStoreSchema, voterStoreSchema } from '../../../../src/modules/dpos_v2/schemas';
import { fakeLogger } from '../../../utils/mocks';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { ModuleConfig } from '../../../../src/modules/dpos_v2/types';

describe('DposModuleEndpoint', () => {
	const logger: Logger = fakeLogger;
	let dposEndpoint: DPoSEndpoint;
	let stateStore: PrefixedStateReadWriter;
	let voterSubStore: PrefixedStateReadWriter;
	let delegateSubStore: PrefixedStateReadWriter;
	const address = utils.getRandomBytes(20);
	const address1 = utils.getRandomBytes(20);
	const address2 = utils.getRandomBytes(20);
	const getStore1 = jest.fn();
	const networkIdentifier = Buffer.alloc(0);
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
	};

	const config: ModuleConfig = {
		...defaultConfig,
		minWeightStandby: BigInt(defaultConfig.minWeightStandby),
		tokenIDDPoS: Buffer.from(defaultConfig.tokenIDDPoS, 'hex'),
	};

	beforeEach(() => {
		dposEndpoint = new DPoSEndpoint(MODULE_ID_DPOS_BUFFER);
		dposEndpoint.init(config);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		voterSubStore = stateStore.getStore(dposEndpoint['moduleID'], STORE_PREFIX_VOTER);
		delegateSubStore = stateStore.getStore(dposEndpoint['moduleID'], STORE_PREFIX_DELEGATE);
	});

	describe('getVoter', () => {
		describe('when input address is valid', () => {
			it('should return correct voter data corresponding to the input address', async () => {
				await voterSubStore.setWithSchema(address, voterData, voterStoreSchema);
				getStore1.mockReturnValue(voterSubStore);
				const voterDataReturned = await dposEndpoint.getVoter({
					getStore: getStore1,
					getImmutableAPIContext: jest.fn(),
					logger,
					params: {
						address: address.toString('hex'),
					},
					networkIdentifier,
					getOffchainStore: jest.fn(),
				});

				expect(voterDataReturned).toStrictEqual(codec.toJSON(voterStoreSchema, voterData));
			});

			it('should return valid JSON output', async () => {
				await voterSubStore.setWithSchema(address, voterData, voterStoreSchema);
				getStore1.mockReturnValue(voterSubStore);
				const voterDataReturned = await dposEndpoint.getVoter({
					getStore: getStore1,
					getImmutableAPIContext: jest.fn(),
					logger,
					params: {
						address: address.toString('hex'),
					},
					networkIdentifier,
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
				await delegateSubStore.setWithSchema(address, delegateData, delegateStoreSchema);
				getStore1.mockReturnValue(delegateSubStore);
				const delegateDataReturned = await dposEndpoint.getDelegate({
					getStore: getStore1,
					getImmutableAPIContext: jest.fn(),
					logger,
					params: {
						address: address.toString('hex'),
					},
					networkIdentifier,
					getOffchainStore: jest.fn(),
				});

				const delegateDataJSON = {
					...delegateData,
					totalVotesReceived: delegateData.totalVotesReceived.toString(),
					selfVotes: delegateData.selfVotes.toString(),
				};

				expect(delegateDataReturned).toStrictEqual(delegateDataJSON);
			});

			it('should return valid JSON output', async () => {
				await delegateSubStore.setWithSchema(address, delegateData, delegateStoreSchema);
				getStore1.mockReturnValue(delegateSubStore);
				const delegateDataReturned = await dposEndpoint.getDelegate({
					getStore: getStore1,
					getImmutableAPIContext: jest.fn(),
					logger,
					params: {
						address: address.toString('hex'),
					},
					networkIdentifier,
					getOffchainStore: jest.fn(),
				});

				expect(delegateDataReturned.totalVotesReceived).toBeString();
				expect(delegateDataReturned.selfVotes).toBeString();
			});
		});
	});

	describe('getAllDelegates', () => {
		describe('when input address is valid', () => {
			it('should return correct data for all delegates', async () => {
				await delegateSubStore.setWithSchema(address1, delegateData, delegateStoreSchema);
				await delegateSubStore.setWithSchema(address2, delegateData, delegateStoreSchema);
				getStore1.mockReturnValue(delegateSubStore);
				const { delegates: delegatesDataReturned } = await dposEndpoint.getAllDelegates({
					getStore: getStore1,
					getImmutableAPIContext: jest.fn(),
					logger,
					params: {},
					networkIdentifier,
					getOffchainStore: jest.fn(),
				});

				expect(delegatesDataReturned[0]).toStrictEqual(
					codec.toJSON(delegateStoreSchema, delegateData),
				);
				expect(delegatesDataReturned[1]).toStrictEqual(
					codec.toJSON(delegateStoreSchema, delegateData),
				);
			});

			it('should return valid JSON output', async () => {
				await delegateSubStore.setWithSchema(address, delegateData, delegateStoreSchema);
				await delegateSubStore.setWithSchema(address1, delegateData, delegateStoreSchema);
				getStore1.mockReturnValue(delegateSubStore);
				const { delegates: delegatesDataReturned } = await dposEndpoint.getAllDelegates({
					getStore: getStore1,
					getImmutableAPIContext: jest.fn(),
					logger,
					params: {},
					networkIdentifier,
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
