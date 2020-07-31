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

import { isBase64String, validator, LiskValidationError } from '@liskhq/lisk-validator';
import { Request, Response } from 'express';
import { BaseChannel, PluginCodec } from 'lisk-framework';

const transactionInputSchema = {
	type: 'object',
	required: ['type', 'nonce', 'fee', 'senderPublicKey', 'asset', 'signatures'],
	properties: {
		type: {
			type: 'number',
			description: 'Describes the Transaction type.',
		},
		fee: {
			type: 'string',
			description: 'Transaction fee associated with this transaction.\n',
		},
		nonce: {
			type: 'string',
			example: '1',
			description: 'Unique sequence of number per account.\n',
		},
		senderPublicKey: {
			type: 'string',
			format: 'base64',
			description: 'Base64 encoded value of the public key of the Senders account.\n',
		},
		asset: {
			type: 'object',
			description: 'Object stored per transaction type',
		},
		signatures: {
			type: 'array',
			items: {
				type: 'string',
				format: 'base64',
				description: 'Base64 encoded value of the signature for the transaction.',
			},
			minItems: 1,
		},
	},
};

interface TransactionInput {
	id: string;
	type: number;
	fee: string;
	nonce: string;
	senderPublicKey: string;
	asset: object;
	signatures: string[];
}

export const getTransaction = (channel: BaseChannel, codec: PluginCodec) => async (
	req: Request,
	res: Response,
): Promise<void> => {
	const transactionId = req.params.id;

	// 400 - Client Side Error
	if (!transactionId || !isBase64String(transactionId)) {
		res.status(400).send({
			errors: [{ message: 'Transaction id parameter should be a base64 string.' }],
		});
		return;
	}
	let transaction: string;

	try {
		transaction = await channel.invoke<string>('app:getTransactionByID', {
			id: transactionId,
		});
	} catch (error) {
		// 404 - Not Found Error
		res.status(404).json({
			errors: [{ message: `The transaction with id "${transactionId}" not found.` }],
		});
		return;
	}

	// 200 - Response
	res.status(200).json({ data: codec.decodeTransaction(transaction), meta: {} });
};

export const postTransaction = (channel: BaseChannel, codec: PluginCodec) => async (
	req: Request,
	res: Response,
): Promise<void> => {
	const errors = validator.validate(transactionInputSchema, req.body);

	// 400 - Malformed query or parameters
	if (errors.length) {
		res.status(400).send({
			errors: [{ message: new LiskValidationError([...errors]).message }],
		});
		return;
	}

	try {
		const encodedTransaction = codec.encodeTransaction(req.body as TransactionInput);

		const result = await channel.invoke<{
			transactionId?: string;
			message?: string;
			errors?: Error[] | Error;
		}>('app:postTransaction', {
			transaction: encodedTransaction,
		});

		res.status(200).json({ data: result, meta: {} });
	} catch (err) {
		res
			.status(409)
			.json({ error: (err as Error).message.replace('Lisk validator found 1 error[s]:\n', '') });
	}
};
