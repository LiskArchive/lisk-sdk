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

	if (limit && !isNumberString(limit)) {
		res.status(400).send({
			errors: [{ message: 'The limit query parameter should be a number.' }],
		});
		return;
	}
	const limitNumber = Number(limit) || 10;

	if (offset && !isNumberString(offset)) {
		res.status(400).send({
			errors: [{ message: 'The offset query parameter should be a number.' }],
		});
		return;
	}
	const offsetNumber = Number(offset) || 0;

	let transactionsInPool;

	try {
		transactionsInPool = await channel.invoke<ReadonlyArray<Buffer>>('app:getTransactionsFromPool');
	} catch (err) {
		next(err);
		return;
	}
	const totalTransactionsInPool = transactionsInPool.length;

	transactionsInPool = transactionsInPool.slice(
		offsetNumber || 0,
		Math.min(limitNumber + offsetNumber, transactionsInPool.length),
	);

	const decodedTransactions = [];
	for (const transaction of transactionsInPool) {
		decodedTransactions.push(codec.decodeTransaction(transaction));
	}

	// 200 - Response
	res.status(200).json({
		data: decodedTransactions,
		meta: { limit: limitNumber, offset: offsetNumber, total: totalTransactionsInPool },
	});
};
