/*
 * Copyright © 2018 Lisk Foundation
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
 *
 */
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { ErrorObject, ValidateFunction } from 'ajv';
import { TransactionError } from '../../errors';
import {
	MultiSignatureTransaction,
	TransactionJSON,
} from '../../transaction_types';
import { getId } from '../get_transaction_id';
import * as schemas from './schema';
import { validator } from './validator';

const TRANSACTION_TYPE_MULTI_SIGNATURE = 4;

const schemaMap: { readonly [key: number]: ValidateFunction } = {
	0: validator.compile(schemas.transferTransaction),
	1: validator.compile(schemas.signatureTransaction),
	2: validator.compile(schemas.delegateTransaction),
	3: validator.compile(schemas.voteTransaction),
	4: validator.compile(schemas.multiTransaction),
	5: validator.compile(schemas.dappTransaction),
};

const getTransactionSchemaValidator = (type: number): ValidateFunction => {
	const schema = schemaMap[type];
	if (!schema) {
		throw new Error('Unsupported transaction type.');
	}

	return schema;
};

interface ValidationResult {
	readonly errors?: ReadonlyArray<ErrorObject>;
	readonly valid: boolean;
}

const validateMultiTransaction = (
	tx: MultiSignatureTransaction,
): ValidationResult => {
	if (tx.asset.multisignature.min > tx.asset.multisignature.keysgroup.length) {
		return {
			valid: false,
			errors: [
				{
					dataPath: '.asset.multisignature.min',
					keyword: 'multisignatures.keysgroup.min',
					message:
						'.asset.multisignature.min cannot be greater than .asset.multisignature.keysgroup.length',
					params: {},
					schemaPath: 'lisk/base-transaction',
				},
			] as ReadonlyArray<ErrorObject>,
		};
	}

	return {
		valid: true,
	};
};

const isMultiSignatureTransaction = (
	tx: TransactionJSON,
): tx is MultiSignatureTransaction =>
	tx.type === TRANSACTION_TYPE_MULTI_SIGNATURE;

export const validateTransaction = (tx: TransactionJSON): ValidationResult => {
	if (tx.type === undefined || tx.type === null) {
		throw new Error('Transaction type is required.');
	}

	const validateSchema = getTransactionSchemaValidator(tx.type);
	const valid = validateSchema(tx) as boolean;
	// Ajv produces merge error when error happens within $merge
	const errors = validateSchema.errors
		? validateSchema.errors.filter(
				(e: { readonly keyword: string }) => e.keyword !== '$merge',
		  )
		: undefined;
	if (valid && isMultiSignatureTransaction(tx)) {
		return validateMultiTransaction(tx);
	}

	return {
		valid,
		errors,
	};
};

export const isUnique = (values: ReadonlyArray<string>): boolean => {
	const unique = [...new Set(values)];

	return unique.length === values.length;
};

export const validateTransactionId = (
	id: string,
	bytes: Buffer,
): TransactionError | undefined => {
	const acutalId = getId(bytes);

	return id !== acutalId
		? new TransactionError(`Invalid transaction id`, id, '.id', acutalId, id)
		: undefined;
};

export const validateSenderIdAndPublicKey = (
	id: string,
	senderId: string,
	senderPublicKey: string,
): TransactionError | undefined => {
	const actualAddress = getAddressFromPublicKey(senderPublicKey);

	return senderId.toUpperCase() !== actualAddress.toUpperCase()
		? new TransactionError(
				'`senderId` does not match `senderPublicKey`',
				id,
				'.senderId',
				actualAddress,
				senderId,
		  )
		: undefined;
};
