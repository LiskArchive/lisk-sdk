/*
 * Copyright © 2020 Lisk Foundation
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

import { DefaultAccountAsset, GenesisAccountState } from '../../src';
import { mergeDeep } from '../../src/utils';

const delegates = [
	{
		address: 'JdTB7S2iS6hWuJTCCRiPcODKq24=',
		balance: 2874239947,
		asset: { delegate: { username: 'ef374a2e8fb9934ad1db0fd5346eb7' } },
	},
	{
		address: 'I3C6mEUeH/AHAp8eYC4Uuwl7UW8=',
		balance: 2620126571,
		asset: { delegate: { username: '13462f8e59880cfde6280d34dfd044' } },
	},
	{
		address: 'NLPa3tVQ9bDFCUfY4XdiuXMM8fk=',
		balance: 2384412768,
		asset: { delegate: { username: '920cc701231b2f8c624d4bc8f4c267' } },
	},
	{
		address: 'NyudB23TfnwYPPbtA8F92M3A0xI=',
		balance: 28138131,
		asset: { delegate: { username: '4a1076aa54533dce1c9b7ed51c509b' } },
	},
	{
		address: 'bjWFsRdRQjpy61tJ9XlAvlCQR1c=',
		balance: 2165380961,
		asset: { delegate: { username: '98beeddc903498ed7cdd36b417b40f' } },
	},
];

const accounts = [
	{
		address: '3t+9TGoa0e8NepXNaQcRRUjYxtg=',
		balance: 653021139,
	},
	{
		address: 'w8MHF05a4wHElDlsD9tjB+xOxgw=',
		balance: 1966001160,
	},
	{
		address: 'gOCNMiwktTKaJXxbG9dXgDLTuSE=',
		balance: 3116632800,
	},
	{
		address: 'wBi13X2ktre/Tmxojo1+mEHUqo8=',
		balance: 2910960211,
	},
	{
		address: 'UsldJKfqQ9IC2ooNp/CMM6TrbVw=',
		balance: 4218444994,
	},
	{
		address: 'TJUT73sLzO4CRVlHRwCq1wN3BDs=',
		balance: 476696623,
	},
	{
		address: 'nTSmlVHYuF7A9VLWXqjdNXJN7pA=',
		balance: 4056778033,
	},
	{
		address: 'w8Y2FSQEMyXoq86MwfiZ4sL/2bA=',
		balance: 3756324977,
	},
	{
		address: '2fvbTyL6pgk2oBE0V9oBnrYcPXc=',
		balance: 489340925,
	},
	{
		address: 'YhUMz5HMFjT5MO7Qt3YPQhdSppg=',
		balance: 1340967959,
	},
];

export const defaultAccountAsset = {
	delegate: {
		username: '',
		pomHeights: [],
		consecutiveMissedBlocks: 0,
		lastForgedHeight: 0,
		isBanned: false,
		totalVotesReceived: BigInt(0),
	},
	sentVotes: [],
	unlocking: [],
};

const prepareAccounts = (
	data: {
		address: string;
		balance: number;
		asset?: {
			delegate: {
				username: string;
			};
		};
	}[],
): Partial<GenesisAccountState<DefaultAccountAsset>>[] => {
	return data.map(acc => ({
		address: Buffer.from(acc.address, 'base64'),
		balance: BigInt(acc.balance),
		asset: mergeDeep({}, defaultAccountAsset, acc.asset ?? {}) as DefaultAccountAsset,
	}));
};

export const validAccounts = prepareAccounts(accounts);

export const validDelegateAccounts = prepareAccounts(delegates);

export const validGenesisBlockParams = {
	initRounds: 5,
	height: 5,
	timestamp: 1591873718,
	previousBlockID: Buffer.from('RUaQocN4ODJgB1GafOHIpqSV31CJjx69adIvvO35aJo=', 'base64'),
	roundLength: 103,
	initDelegates: validDelegateAccounts.map(a => a.address) as Buffer[],
	accounts: [...validAccounts, ...validDelegateAccounts] as GenesisAccountState<
		DefaultAccountAsset
	>[],
};
