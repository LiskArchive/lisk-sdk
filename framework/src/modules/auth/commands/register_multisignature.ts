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
import { MAX_NUMBER_OF_SIGNATURES, MESSAGE_TAG_MULTISIG_REG } from '../constants';
import { multisigRegMsgSchema, registerMultisignatureParamsSchema } from '../schemas';
import { RegisterMultisignatureParams } from '../types';
import { InvalidSignatureEvent } from '../events/invalid_signature';
import { MultisignatureRegistrationEvent } from '../events/multisignature_registration';

export class RegisterMultisignatureCommand extends BaseCommand {
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

		if (mandatoryKeys.length + optionalKeys.length < numberOfSignatures) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
				),
			};
		}

		if (
			mandatoryKeys.length + optionalKeys.length > MAX_NUMBER_OF_SIGNATURES ||
			mandatoryKeys.length + optionalKeys.length < 1
		) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					`The count of Mandatory and Optional keys should be between 1 and ${MAX_NUMBER_OF_SIGNATURES}.`,
				),
			};
		}

		if (mandatoryKeys.length > numberOfSignatures) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys.',
				),
			};
		}

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

		if (mandatoryKeys.length + optionalKeys.length !== signatures.length) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'The number of mandatory and optional keys should match the number of signatures',
				),
			};
		}

		const sortedMandatoryKeys = [...mandatoryKeys].sort((a, b) => a.compare(b));
		for (let i = 0; i < sortedMandatoryKeys.length; i += 1) {
			if (!mandatoryKeys[i].equals(sortedMandatoryKeys[i])) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Mandatory keys should be sorted lexicographically.'),
				};
			}
		}

		const sortedOptionalKeys = [...optionalKeys].sort((a, b) => a.compare(b));
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
		const { transaction, params } = context;
		const message = codec.encode(multisigRegMsgSchema, {
			address: transaction.senderAddress,
			nonce: transaction.nonce,
			numberOfSignatures: params.numberOfSignatures,
			mandatoryKeys: params.mandatoryKeys,
			optionalKeys: params.optionalKeys,
		});

		const allKeys = [...params.mandatoryKeys, ...params.optionalKeys].map((key, index) => ({
			key,
			signature: params.signatures[index],
		}));

		for (const { key, signature } of allKeys) {
			const isValid = cryptography.ed.verifyData(
				MESSAGE_TAG_MULTISIG_REG,
				context.chainID,
				message,
				signature,
				key,
			);
			if (!isValid) {
				this.events.get(InvalidSignatureEvent).error(context, transaction.senderAddress, {
					numberOfSignatures: params.numberOfSignatures,
					mandatoryKeys: params.mandatoryKeys,
					optionalKeys: params.optionalKeys,
					failingPublicKey: key,
					failingSignature: signature,
				});
				throw new Error(`Invalid signature for public key ${key.toString('hex')}.`);
			}
		}

		const authSubstore = this.stores.get(AuthAccountStore);
		const senderAccount = await authSubstore.get(context, transaction.senderAddress);

		senderAccount.mandatoryKeys = params.mandatoryKeys;
		senderAccount.optionalKeys = params.optionalKeys;
		senderAccount.numberOfSignatures = params.numberOfSignatures;

		await authSubstore.set(context, transaction.senderAddress, senderAccount);

		this.events.get(MultisignatureRegistrationEvent).log(context, transaction.senderAddress, {
			numberOfSignatures: params.numberOfSignatures,
			mandatoryKeys: params.mandatoryKeys,
			optionalKeys: params.optionalKeys,
		});
	}
}
