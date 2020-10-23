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
import { BaseChannel } from 'lisk-framework';
import { PeerInfo, SharedState } from '../types';

const getAverage = (
	transactionsStats: Pick<SharedState['transactions'], 'transactions'>,
): number => {
	let transactionCount = 0;
	let total = 0;

	for (const transactionStats of Object.values(transactionsStats.transactions)) {
		transactionCount += 1;
		total += transactionStats.count;
	}

	return total / transactionCount;
};

export const getTransactionStats = (channel: BaseChannel, state: SharedState) => async (
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const { transactions } = state;
	res.json({
		data: {
			transactions: transactions.transactions,
			connectedPeers: (await channel.invoke<ReadonlyArray<PeerInfo>>('app:getConnectedPeers'))
				.length,
			averageReceivedTransactions: getAverage(transactions),
		},
		meta: {},
	});
	next();
};
