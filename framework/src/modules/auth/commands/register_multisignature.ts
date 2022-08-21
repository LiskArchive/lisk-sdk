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

import { codec } from '@liskhq/lisk-codec';
import { objects as objectUtils } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import * as cryptography from '@liskhq/lisk-cryptography';
import { BaseCommand } from '../..';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { AuthAccountStore } from '../stores/auth_account';
import {
	COMMAND_ID_REGISTER_MULTISIGNATURE_GROUP,
	COMMAND_NAME_REGISTER_MULTISIGNATURE_GROUP,
	MAX_NUMBER_OF_SIGNATURES,
	MESSAGE_TAG_MULTISIG_REG,
	TYPE_ID_INVALID_SIGNATURE_ERROR,
	TYPE_ID_MULTISIGNATURE_GROUP_REGISTERED,
} from '../constants';
import {
	authAccountSchema,
	invalidSigDataSchema,
	multisigRegDataSchema,
	multisigRegMsgSchema,
	registerMultisignatureParamsSchema,
} from '../schemas';
import { AuthAccount, RegisterMultisignatureParams } from '../types';
import { getIDAsKeyForStore } from '../utils';

export class RegisterMultisignatureCommand extends BaseCommand {
	public id = getIDAsKeyForStore(COMMAND_ID_REGISTER_MULTISIGNATURE_GROUP);
	public name = COMMAND_NAME_REGISTER_MULTISIGNATURE_GROUP;
	public schema = registerMultisignatureParamsSchema;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<RegisterMultisignatureParams>,
	): Promise<VerificationResult> {
		const { mandatoryKeys, optionalKeys, numberOfSignatures, signatures } = context.params;
		try {
			validator.validate(registerMultisignatureParamsSchema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

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
			mandatoryKeys.length + optionalKeys.length > MAX_NUMBER_OF_SIGNATURES ||
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
		if (mandatoryKeys.length + optionalKeys.length !== signatures.length) {
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
		const message = codec.encode(multisigRegMsgSchema, {
			address: transaction.senderAddress,
			nonce: transaction.nonce,
			numberOfSignatures: context.params.numberOfSignatures,
			mandatoryKeys: context.params.mandatoryKeys,
			optionalKeys: context.params.optionalKeys,
		});

		const allKeys = [
			...context.params.mandatoryKeys,
			...context.params.optionalKeys,
		].map((key, index) => ({ key, signature: context.params.signatures[index] }));

		for (const { key, signature } of allKeys) {
			const isValid = cryptography.ed.verifyData(
				MESSAGE_TAG_MULTISIG_REG,
				context.networkIdentifier,
				message,
				signature,
				key,
			);
			if (!isValid) {
				const invalidSignatureEventData = codec.encode(invalidSigDataSchema, {
					numberOfSignatures: context.params.numberOfSignatures,
					mandatoryKeys: context.params.mandatoryKeys,
					optionalKeys: context.params.optionalKeys,
					failingPublicKey: key,
					failingSignature: signature,
				});

				context.eventQueue.add(
					this.name,
					TYPE_ID_INVALID_SIGNATURE_ERROR,
					invalidSignatureEventData,
					[transaction.senderAddress],
				);
				throw new Error(`Invalid signature for public key ${key.toString('hex')}.`);
			}
		}

		const authSubstore = this.stores.get(AuthAccountStore);
		const senderAccount = await authSubstore.get(context, transaction.senderAddress);

		// Check if multisignatures already exists on account
		if (senderAccount.numberOfSignatures > 0) {
			throw new Error('Register multisignature only allowed once per account.');
		}

		senderAccount.mandatoryKeys = context.params.mandatoryKeys;
		senderAccount.optionalKeys = context.params.optionalKeys;
		senderAccount.numberOfSignatures = context.params.numberOfSignatures;

		await authSubstore.setWithSchema(transaction.senderAddress, senderAccount, authAccountSchema);

		const registerMultiSigEventData = codec.encode(multisigRegDataSchema, {
			numberOfSignatures: context.params.numberOfSignatures,
			mandatoryKeys: context.params.mandatoryKeys,
			optionalKeys: context.params.optionalKeys,
		});

		context.eventQueue.add(
			this.name,
			TYPE_ID_MULTISIGNATURE_GROUP_REGISTERED,
			registerMultiSigEventData,
			[transaction.senderAddress],
		);
	}
}
