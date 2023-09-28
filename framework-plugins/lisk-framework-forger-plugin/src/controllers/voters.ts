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

import { BaseChannel, PluginCodec } from 'lisk-framework';
import { Database } from '@liskhq/lisk-db';
import { Forger, DPoSAccountJSON } from '../types';
import { getForgerInfo } from '../db';

interface Voter {
	readonly address: string;
	readonly username: string;
	readonly totalVotesReceived: string;
	readonly voters: {
		readonly address: string;
		readonly amount: string;
	}[];
}

export const getVoters = async (
	channel: BaseChannel,
	codec: PluginCodec,
	db: Database,
): Promise<Voter[]> => {
	const forgersList = await channel.invoke<Forger[]>('app:getForgingStatus');
	const forgerAccounts = (
		await channel.invoke<string[]>('app:getAccounts', {
			address: forgersList.map(forger => forger.address),
		})
	).map(encodedAccount => codec.decodeAccount<DPoSAccountJSON>(encodedAccount));

	const result: Voter[] = [];
	for (const account of forgerAccounts) {
		const forgerInfo = await getForgerInfo(
			db,
			Buffer.from(account.address, 'hex').toString('binary'),
		);

		result.push({
			address: account.address,
			username: account.dpos.delegate.username,
			totalVotesReceived: account.dpos.delegate.totalVotesReceived,
			voters: forgerInfo.votesReceived.map(vote => ({
				address: vote.address.toString('hex'),
				amount: vote.amount.toString(),
			})),
		});
	}

	return result;
};
