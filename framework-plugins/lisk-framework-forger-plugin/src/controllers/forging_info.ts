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

import { Request, Response, NextFunction } from 'express';
import { BaseChannel, PluginCodec } from 'lisk-framework';
import { KVStore } from '@liskhq/lisk-db';
import { getForgerInfo } from '../db';
import { Forger } from '../types';

export const getForgingInfo = (
	channel: BaseChannel,
	codec: PluginCodec,
	forgerPluginDB: KVStore,
) => async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const forgersInfo = await channel.invoke<ReadonlyArray<Forger>>(
			'app:getForgerAddressesForRound',
		);
		const forgerAccounts = await channel.invoke<Buffer[]>('app:getAccounts', {
			address: forgersInfo.map(forgerInfo => forgerInfo.address),
		});

		const data = [];
		for (let i = 0; i < forgerAccounts.length; i += 1) {
			const account = codec.decodeAccount(forgerAccounts[i]);
			const forgerAddressBinary = Buffer.from(account.address, 'base64').toString('binary');
			const forgerInfo = await getForgerInfo(forgerPluginDB, forgerAddressBinary);

			data.push({
				username: account.asset.delegate.username,
				totalReceivedFees: forgerInfo.totalReceivedFees,
				totalReceivedRewards: forgerInfo.totalReceivedRewards,
				totalProducedBlocks: forgerInfo.totalProducedBlocks,
				totalVotesReceived: account.asset.delegate.totalVotesReceived,
				consecutiveMissedBlocks: account.asset.delegate.consecutiveMissedBlocks,
				...forgersInfo[i],
			});
		}

		res.status(200).json({
			data,
			meta: {},
		});
	} catch (err) {
		next(err);
	}
};
