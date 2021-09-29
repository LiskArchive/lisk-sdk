/*
 * Copyright © 2021 Lisk Foundation
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

import { objects as objectUtils } from '@liskhq/lisk-utils';
import { BaseCommand } from '../..';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../node/state_machine';
import {
	COMMAND_ID_MULTISIGNATURE_REGISTRATION,
	MAX_KEYS_COUNT,
	MODULE_ID_AUTH,
	STORE_PREFIX_AUTH,
} from '../constants';
import { authAccountSchema, registerMultisignatureParamsSchema } from '../schemas';
import { AuthAccount, RegisterMultisignatureParams } from '../types';

export class RegisterMultisignatureCommand extends BaseCommand {
	public id = COMMAND_ID_MULTISIGNATURE_REGISTRATION;
	public name = 'registerMultisignatureGroup';
	public schema = registerMultisignatureParamsSchema;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<RegisterMultisignatureParams>,
	): Promise<VerificationResult> {
		const { transaction } = context;
		const { mandatoryKeys, optionalKeys, numberOfSignatures } = context.params;

		if (!objectUtils.bufferArrayUniqueItems(mandatoryKeys)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('MandatoryKeys contains duplicate public keys.'),
			};
		}

		if (!objectUtils.bufferArrayUniqueItems(optionalKeys)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('OptionalKeys contains duplicate public keys.'),
			};
		}

		// Check if key count is less than number of required signatures
		if (mandatoryKeys.length + optionalKeys.length < numberOfSignatures) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
				),
			};
		}

		// Check if key count is out of bounds
		if (
			mandatoryKeys.length + optionalKeys.length > MAX_KEYS_COUNT ||
			mandatoryKeys.length + optionalKeys.length <= 0
		) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('The count of Mandatory and Optional keys should be between 1 and 64.'),
			};
		}

		// The numberOfSignatures needs to be equal or bigger than number of mandatoryKeys
		if (mandatoryKeys.length > numberOfSignatures) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys.',
				),
			};
		}

		// Check if keys are repeated between mandatory and optional key sets
		const repeatedKeys = mandatoryKeys.filter(
			value => optionalKeys.find(optional => optional.equals(value)) !== undefined,
		);
		if (repeatedKeys.length > 0) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Invalid combination of Mandatory and Optional keys. Repeated keys across Mandatory and Optional were found.',
				),
			};
		}

		// Check if the length of mandatory, optional and sender keys matches the length of signatures
		if (mandatoryKeys.length + optionalKeys.length + 1 !== transaction.signatures.length) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'The number of mandatory, optional and sender keys should match the number of signatures',
				),
			};
		}

		// Check keys are sorted lexicographically
		const sortedMandatoryKeys = [...mandatoryKeys].sort((a, b) => a.compare(b));
		const sortedOptionalKeys = [...optionalKeys].sort((a, b) => a.compare(b));
		for (let i = 0; i < sortedMandatoryKeys.length; i += 1) {
			if (!mandatoryKeys[i].equals(sortedMandatoryKeys[i])) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Mandatory keys should be sorted lexicographically.'),
				};
			}
		}

		for (let i = 0; i < sortedOptionalKeys.length; i += 1) {
			if (!optionalKeys[i].equals(sortedOptionalKeys[i])) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Optional keys should be sorted lexicographically.'),
				};
			}
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(
		context: CommandExecuteContext<RegisterMultisignatureParams>,
	): Promise<void> {
		const { transaction } = context;
		const authSubstore = context.getStore(MODULE_ID_AUTH, STORE_PREFIX_AUTH);
		const senderAccount = await authSubstore.getWithSchema<AuthAccount>(
			transaction.senderAddress,
			authAccountSchema,
		);

		// Check if multisignatures already exists on account
		if (senderAccount.numberOfSignatures > 0) {
			throw new Error('Register multisignature only allowed once per account.');
		}

		senderAccount.mandatoryKeys = context.params.mandatoryKeys;
		senderAccount.optionalKeys = context.params.optionalKeys;
		senderAccount.numberOfSignatures = context.params.numberOfSignatures;

		await authSubstore.setWithSchema(transaction.senderAddress, senderAccount, authAccountSchema);
	}
}
