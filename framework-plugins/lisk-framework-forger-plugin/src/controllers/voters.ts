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

import { NextFunction, Request, Response } from 'express';
import { BaseChannel, PluginCodec } from 'lisk-framework';
import { KVStore } from '@liskhq/lisk-db';
import { Forger } from '../types';
import { getForgerInfo } from '../db';

export const getVoters = (channel: BaseChannel, codec: PluginCodec, db: KVStore) => async (
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const forgersList = await channel.invoke<Forger[]>('app:getForgingStatusOfAllDelegates');
		const forgerAccounts = (
			await channel.invoke<string[]>('app:getAccounts', {
				address: forgersList.map(forger => forger.address),
			})
		).map(encodedAccount => codec.decodeAccount(encodedAccount));

		const result = [];
		for (const account of forgerAccounts) {
			const forgerInfo = await getForgerInfo(
				db,
				Buffer.from(account.address, 'base64').toString('binary'),
			);

			result.push({
				address: account.address,
				username: account.asset.delegate.username,
				totalVotesReceived: account.asset.delegate.totalVotesReceived,
				voters: forgerInfo.votesReceived.map(vote => ({
					address: vote.address,
					amount: vote.amount.toString(),
				})),
			});
		}

		res.status(200).json({ data: result, meta: { count: result.length } });
	} catch (error) {
		next(error);
	}
};
