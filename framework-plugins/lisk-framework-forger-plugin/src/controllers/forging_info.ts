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
import { getForgerInfo } from '../db';
import { Forger, DPoSAccountJSON } from '../types';

interface ForgerInfo extends Forger {
	readonly username: string;
	readonly totalReceivedFees: string;
	readonly totalReceivedRewards: string;
	readonly totalProducedBlocks: number;
	readonly totalVotesReceived: string;
	readonly consecutiveMissedBlocks: number;
}

export const getForgingInfo = async (
	channel: BaseChannel,
	codec: PluginCodec,
	db: Database,
): Promise<ForgerInfo[]> => {
	const forgingDelegates = await channel.invoke<ReadonlyArray<Forger>>('app:getForgingStatus');
	const encodedAccounts = await channel.invoke<string[]>('app:getAccounts', {
		address: forgingDelegates.map(forger => forger.address),
	});
	const forgerAccounts = encodedAccounts.map(encodedAccount =>
		codec.decodeAccount<DPoSAccountJSON>(encodedAccount),
	);

	const data: ForgerInfo[] = [];
	for (const forgerAccount of forgerAccounts) {
		const forgerAddressBinary = Buffer.from(forgerAccount.address, 'hex').toString('binary');
		const forgerInfo = await getForgerInfo(db, forgerAddressBinary);
		const forger = forgingDelegates.find(aForger => aForger.address === forgerAccount.address);

		if (forger) {
			data.push({
				...forger,
				username: forgerAccount.dpos.delegate.username,
				totalReceivedFees: forgerInfo.totalReceivedFees.toString(),
				totalReceivedRewards: forgerInfo.totalReceivedRewards.toString(),
				totalProducedBlocks: forgerInfo.totalProducedBlocks,
				totalVotesReceived: forgerAccount.dpos.delegate.totalVotesReceived,
				consecutiveMissedBlocks: forgerAccount.dpos.delegate.consecutiveMissedBlocks,
			});
		}
	}

	return data;
};
