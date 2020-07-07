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

import { isBase64String } from '@liskhq/lisk-validator';
import { Request, Response } from 'express';
import { BaseChannel, PluginCodec } from 'lisk-framework';

export const getTransaction = (
	channel: BaseChannel,
	codec: PluginCodec,
) => async (req: Request, res: Response): Promise<void> => {
	const transactionId = req.params.id;

	// 400 - Client Side Error
	if (!transactionId || !isBase64String(transactionId)) {
		res.status(400).send({
			errors: [
				{ message: 'The transaction id parameter should be a base64 string.' },
			],
		});
		return;
	}

	let transaction: string;

	try {
		transaction = await channel.invoke<string>('app:getTransactionByID', {
			id: transactionId,
		});
	} catch (error) {
		if (
			(error as Error).message ===
			'Specified key transactions:id:×m does not exist'
		) {
			// 404 - Not Found Error
			res.status(404).send({
				errors: [
					{ message: `The transaction with id ${transactionId} not found.` },
				],
			});
			return;
		}

		// 500 - Server Error
		throw error;
	}

	// 200 - Response
	res.status(200).json(codec.decodeTransaction(transaction));
};
