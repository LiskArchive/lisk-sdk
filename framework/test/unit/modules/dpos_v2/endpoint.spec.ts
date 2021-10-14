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
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { Logger } from '../../../../src/logger';
import {
	MODULE_ID_DPOS,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_VOTER,
} from '../../../../src/modules/dpos_v2/constants';
import { DPoSEndpoint } from '../../../../src/modules/dpos_v2/endpoint';
import { delegateStoreSchema, voterStoreSchema } from '../../../../src/modules/dpos_v2/schemas';
import { VoterDataJSON } from '../../../../src/modules/dpos_v2/types';
import { fakeLogger } from '../../../utils/node';

describe('DposModuleEndpoint', () => {
	const logger: Logger = fakeLogger;
	let dposEndpoint: DPoSEndpoint;
	let stateStore: StateStore;
	let voterSubStore: StateStore;
	let delegateSubStore: StateStore;
	const address = getRandomBytes(48);
	const address1 = getRandomBytes(48);
	const getStore1 = jest.fn();
	const networkIdentifier = Buffer.alloc(0);
	const voterData = {
		sentVotes: [
			{
				delegateAddress: getRandomBytes(48),
				amount: BigInt(0),
			},
		],
		pendingUnlocks: [
			{
				delegateAddress: getRandomBytes(48),
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

	beforeAll(async () => {
		dposEndpoint = new DPoSEndpoint(MODULE_ID_DPOS);
	});

	beforeEach(() => {
		stateStore = new StateStore(new InMemoryKVStore());
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
					logger,
					params: {
						address: address.toString('hex'),
					},
					networkIdentifier,
				});

				const voterDataJSON = { sentVotes: [], pendingUnlocks: [] } as VoterDataJSON;

				for (const sentVote of voterData.sentVotes) {
					voterDataJSON.sentVotes.push({
						delegateAddress: sentVote.delegateAddress.toString('hex'),
						amount: sentVote.amount.toString(),
					});
				}

				for (const pendingUnlock of voterData.pendingUnlocks) {
					voterDataJSON.pendingUnlocks.push({
						...pendingUnlock,
						delegateAddress: pendingUnlock.delegateAddress.toString('hex'),
						amount: pendingUnlock.amount.toString(),
					});
				}

				expect(voterDataReturned).toStrictEqual(voterDataJSON);
			});

			it('should return valid JSON output', async () => {
				await voterSubStore.setWithSchema(address, voterData, voterStoreSchema);
				getStore1.mockReturnValue(voterSubStore);
				const voterDataReturned = await dposEndpoint.getVoter({
					getStore: getStore1,
					logger,
					params: {
						address: address.toString('hex'),
					},
					networkIdentifier,
				});

				expect(voterDataReturned.sentVotes[0].delegateAddress).toBeString();
				expect(voterDataReturned.sentVotes[0].amount).toBeString();
				expect(voterDataReturned.pendingUnlocks[0].delegateAddress).toBeString();
				expect(voterDataReturned.pendingUnlocks[0].amount).toBeString();
				expect(voterDataReturned.pendingUnlocks[0].unvoteHeight).toBeNumber();
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
					logger,
					params: {
						address: address.toString('hex'),
					},
					networkIdentifier,
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
					logger,
					params: {
						address: address.toString('hex'),
					},
					networkIdentifier,
				});

				expect(delegateDataReturned.totalVotesReceived).toBeString();
				expect(delegateDataReturned.selfVotes).toBeString();
			});
		});
	});

	describe('getAllDelegates', () => {
		describe('when input address is valid', () => {
			it('should return correct data for all delegates', async () => {
				await delegateSubStore.setWithSchema(address, delegateData, delegateStoreSchema);
				await delegateSubStore.setWithSchema(address1, delegateData, delegateStoreSchema);
				getStore1.mockReturnValue(delegateSubStore);
				const delegatesDataReturned = await dposEndpoint.getAllDelegates({
					getStore: getStore1,
					logger,
					params: {},
					networkIdentifier,
				});

				expect(delegatesDataReturned[0].name).toBe(delegateData.name);
				expect(delegatesDataReturned[0].totalVotesReceived).toBe(
					delegateData.totalVotesReceived.toString(),
				);
				expect(delegatesDataReturned[0].selfVotes).toBe(delegateData.selfVotes.toString());
				expect(delegatesDataReturned[0].lastGeneratedHeight).toBe(delegateData.lastGeneratedHeight);
				expect(delegatesDataReturned[0].isBanned).toBe(delegateData.isBanned);
				expect(delegatesDataReturned[0].pomHeights).toStrictEqual(delegateData.pomHeights);
				expect(delegatesDataReturned[0].consecutiveMissedBlocks).toBe(
					delegateData.consecutiveMissedBlocks,
				);
				expect(delegatesDataReturned[1].name).toBe(delegateData.name);
				expect(delegatesDataReturned[1].totalVotesReceived).toBe(
					delegateData.totalVotesReceived.toString(),
				);
				expect(delegatesDataReturned[1].selfVotes).toBe(delegateData.selfVotes.toString());
				expect(delegatesDataReturned[1].lastGeneratedHeight).toBe(delegateData.lastGeneratedHeight);
				expect(delegatesDataReturned[1].isBanned).toBe(delegateData.isBanned);
				expect(delegatesDataReturned[1].pomHeights).toStrictEqual(delegateData.pomHeights);
				expect(delegatesDataReturned[1].consecutiveMissedBlocks).toBe(
					delegateData.consecutiveMissedBlocks,
				);
			});

			it('should return valid JSON output', async () => {
				await delegateSubStore.setWithSchema(address, delegateData, delegateStoreSchema);
				await delegateSubStore.setWithSchema(address1, delegateData, delegateStoreSchema);
				getStore1.mockReturnValue(delegateSubStore);
				const delegatesDataReturned = await dposEndpoint.getAllDelegates({
					getStore: getStore1,
					logger,
					params: {},
					networkIdentifier,
				});

				expect(delegatesDataReturned[0].totalVotesReceived).toBeString();
				expect(delegatesDataReturned[0].selfVotes).toBeString();
				expect(delegatesDataReturned[1].totalVotesReceived).toBeString();
				expect(delegatesDataReturned[1].selfVotes).toBeString();
			});
		});
	});
});
