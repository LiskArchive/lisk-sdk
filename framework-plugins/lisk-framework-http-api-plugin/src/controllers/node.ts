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
import { isNumberString } from '@liskhq/lisk-validator';

export const getNodeInfo = (channel: BaseChannel) => async (
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const nodeStatusAndInfo = await channel.invoke('app:getNodeInfo');
		res.status(200).send({ data: nodeStatusAndInfo });
	} catch (err) {
		next(err);
	}
};

export const getTransactions = (channel: BaseChannel, codec: PluginCodec) => async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const { limit, offset } = req.query;
	let limitNumber = 0;
	let offsetNumber = 0;
	if (limit) {
		if (!isNumberString(limit)) {
			res.status(400).send({
				errors: [{ message: 'The limit query parameter should be a number.' }],
			});
			return;
		}
		limitNumber = Number(limit);
	}

	if (offset) {
		if (!isNumberString(offset)) {
			res.status(400).send({
				errors: [{ message: 'The offset query parameter should be a number.' }],
			});
			return;
		}
		offsetNumber = Number(offset);
	}

	let transactionsInPool;

	try {
		transactionsInPool = await channel.invoke<string>('app:getTransactionsFromPool');
	} catch (err) {
		next(err);
		return;
	}

	const decodedTransactions = [];
	for (const transaction of transactionsInPool) {
		decodedTransactions.push(codec.decodeTransaction(transaction));
	}

	let data = decodedTransactions;

	if (offset) {
		data = decodedTransactions.slice(offsetNumber, decodedTransactions.length);
	}

	if (limit) {
		data = data.slice(0, limitNumber);
	}

	// 200 - Response
	res.status(200).json({
		data,
		meta: { limit: limitNumber, offset: offsetNumber, total: decodedTransactions.length },
	});
};
