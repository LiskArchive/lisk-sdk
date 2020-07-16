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
import { validator, LiskValidationError, isBase64String } from '@liskhq/lisk-validator';
import { KVStore } from '@liskhq/lisk-db';
import { getForgerInfo } from '../db';

const updateForgingParams = {
	type: 'object',
	properties: {
		address: {
			type: 'string',
			description: 'Address should a Base64 string',
		},
		password: {
			type: 'string',
			description: 'Password should be a string',
		},
		forging: {
			type: 'boolean',
			description: 'Boolean flag to enable or disable forging',
		},
	},
};

export const updateForging = (channel: BaseChannel, db: KVStore) => async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const errors = validator.validate(updateForgingParams, req.body);
	// 400 - Malformed query or parameters
	if (errors.length) {
		res.status(400).send({
			errors: [{ message: new LiskValidationError([...errors]).message }],
		});
		return;
	}
	const { address, password, forging } = req.body as {
		address: string;
		password: string;
		forging: boolean;
	};

	if (!isBase64String(address)) {
		res.status(400).send({
			errors: [{ message: 'The Address parameter should be a base64 string.' }],
		});
		return;
	}

	try {
		const result: { address: string; forging: boolean } = await channel.invoke(
			'app:updateForgingStatus',
			{
				address,
				password,
				forging,
			},
		);

		const {
			totalReceivedFees,
			totalReceivedRewards,
			votesReceived,
			totalProducedBlocks,
			totalMissedBlocks,
		} = await getForgerInfo(db, address);

		res.status(200).json({
			meta: { count: 1 },
			data: {
				address: result.address,
				forging: result.forging,
				totalProducedBlocks,
				votesReceived,
				totalMissedBlocks,
				totalReceivedFees: totalReceivedFees.toString(),
				totalReceivedRewards: totalReceivedRewards.toString(),
			},
		});
	} catch (err) {
		next(err);
	}
};
