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
import { validator, LiskValidationError, isHexString } from '@liskhq/lisk-validator';
import { KVStore } from '@liskhq/lisk-db';
import { getForgerInfo } from '../db';

const updateForgingParams = {
	type: 'object',
	properties: {
		address: {
			type: 'string',
			description: 'Address should be a hex string',
		},
		password: {
			type: 'string',
			description: 'Password should be a string',
		},
		forging: {
			type: 'boolean',
			description: 'Boolean flag to enable or disable forging',
		},
		maxHeightPreviouslyForged: {
			type: 'string',
			format: 'uint32',
			description: 'Delegates previously forged height',
		},
		maxHeightPrevoted: {
			type: 'string',
			format: 'uint32',
			description: 'Delegates Largest prevoted height for a block',
		},
		overwrite: {
			type: 'boolean',
			description: 'Boolean flag to overwrite forger info',
		},
	},
};

interface ForgingResponseData {
	readonly forging: boolean;
	readonly address: string;
}

interface ForgingRequestData extends ForgingResponseData {
	readonly password: string;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
	readonly overwrite?: boolean;
}

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
	const {
		address,
		password,
		forging,
		maxHeightPreviouslyForged,
		maxHeightPrevoted,
		overwrite,
	} = req.body as ForgingRequestData;

	if (!isHexString(address)) {
		res.status(400).send({
			errors: [{ message: 'The address parameter should be a hex string.' }],
		});
		return;
	}

	if (
		maxHeightPreviouslyForged === null ||
		maxHeightPreviouslyForged === undefined ||
		maxHeightPreviouslyForged < 0
	) {
		res.status(400).send({
			errors: [
				{
					message:
						'The maxHeightPreviouslyForged parameter must be specified and greater than or equal to 0.',
				},
			],
		});
		return;
	}

	if (maxHeightPrevoted === null || maxHeightPrevoted === undefined || maxHeightPrevoted < 0) {
		res.status(400).send({
			errors: [
				{
					message:
						'The maxHeightPrevoted parameter must be specified and greater than or equal to 0.',
				},
			],
		});
		return;
	}

	try {
		const result: ForgingResponseData = await channel.invoke('app:updateForgingStatus', {
			address,
			password,
			forging,
			maxHeightPreviouslyForged,
			maxHeightPrevoted,
			overwrite,
		});

		const {
			totalReceivedFees,
			totalReceivedRewards,
			votesReceived,
			totalProducedBlocks,
		} = await getForgerInfo(db, address);

		res.status(200).json({
			meta: { count: 1 },
			data: {
				address: result.address,
				forging: result.forging,
				totalProducedBlocks,
				votesReceived,
				totalReceivedFees: totalReceivedFees.toString(),
				totalReceivedRewards: totalReceivedRewards.toString(),
				maxHeightPreviouslyForged,
				maxHeightPrevoted,
			},
		});
	} catch (err) {
		next(err);
	}
};
