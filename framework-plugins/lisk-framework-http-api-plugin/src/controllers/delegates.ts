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
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { BaseChannel, PluginCodec } from 'lisk-framework';
import { paginateList } from '../utils';

const getDelegatesQuerySchema = {
	type: 'object',
	properties: {
		limit: {
			type: 'string',
			format: 'uint32',
			description: 'Number of delegates to be returned',
		},
		offset: {
			type: 'string',
			format: 'uint32',
			description: 'Offset to get delegates after a specific length in a delegates list',
		},
	},
};

export const getDelegates = (channel: BaseChannel, codec: PluginCodec) => async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const errors = validator.validate(getDelegatesQuerySchema, req.query);
	// 400 - Malformed query or parameters
	if (errors.length) {
		res.status(400).send({
			errors: [{ message: new LiskValidationError([...errors]).message }],
		});
		return;
	}

	const { limit = 100, offset = 0 } = req.query;
	try {
		const encodedDelegates: string[] = await channel.invoke('app:getAllDelegates');
		const decodedDelegates = encodedDelegates.map(delegate => codec.decodeAccount(delegate));

		res.status(200).send({
			meta: { count: decodedDelegates.length, limit: +limit, offset: +offset },
			data: paginateList(decodedDelegates, +limit, +offset),
		});
	} catch (err) {
		next(err);
	}
};
