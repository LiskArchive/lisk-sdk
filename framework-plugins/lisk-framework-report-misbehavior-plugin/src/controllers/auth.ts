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
/* eslint-disable no-param-reassign */
import { Request, Response } from 'express';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import {
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
	getAddressAndPublicKeyFromPassphrase,
} from '@liskhq/lisk-cryptography';
import { Options, States } from '../types';

const requestSchema = {
	$id: 'lisk/report_misbehavior/auth',
	type: 'object',
	required: ['password', 'enable'],
	properties: {
		password: {
			type: 'string',
		},
		enable: {
			type: 'boolean',
		},
	},
};

interface RequestBody {
	readonly password: string;
	readonly enable: boolean;
}

export const auth = (options: Options, states: States) => async (
	req: Request,
	res: Response,
	// eslint-disable-next-line @typescript-eslint/require-await
): Promise<void> => {
	const errors = validator.validate(requestSchema, req.body);
	// 400 - Malformed query or parameters
	if (errors.length) {
		res.status(400).send({
			errors: [{ message: new LiskValidationError([...errors]).message }],
		});
		return;
	}
	const { body } = req as { body: RequestBody };
	if (options.encryptedPassphrase === '') {
		res.status(400).send({
			errors: [{ message: 'Encrypted passphrase is not set in the config.' }],
		});
		return;
	}
	try {
		const parsedEncryptedPassphrase = parseEncryptedPassphrase(options.encryptedPassphrase);
		const passphrase = decryptPassphraseWithPassword(parsedEncryptedPassphrase, body.password);
		const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase);
		states.publicKey = body.enable ? publicKey : undefined;
		states.passphrase = body.enable ? passphrase : undefined;
		const changedState = body.enable ? 'enabled' : 'disabled';
		res.status(200).json({
			meta: {},
			data: {
				message: `Successfully ${changedState} the reporting of misbehavior.`,
			},
		});
	} catch (error) {
		res.status(400).send({
			errors: [{ message: (error as Error).message ?? 'Password given is not valid.' }],
		});
	}
};
