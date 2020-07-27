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
 *
 */

import { validateTransactionSchema } from '../src/validate';

const validTransaction = {
	type: 8,
	nonce: BigInt('1'),
	fee: BigInt('10000000'),
	senderPublicKey: Buffer.from(
		'0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
		'hex',
	),
	asset: {
		recipientAddress: Buffer.from('3a971fd02b4a07fc20aad1936d3cb1d263b96e0f', 'hex'),
		amount: BigInt('4008489300000000'),
		data: '',
	},
};

const validAssetSchema = {
	$id: 'lisk/transfer-transaction',
	title: 'Transfer transaction asset',
	type: 'object',
	required: ['amount', 'recipientAddress', 'data'],
	properties: {
		amount: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 2,
			minLength: 20,
			maxLength: 20,
		},
		data: {
			dataType: 'string',
			fieldNumber: 3,
			minLength: 0,
			maxLength: 64,
		},
	},
};

describe('validateTransactionSchema', () => {
	it('should return error for invalid transaction header', () => {
		const invalidTransactionObjects = [
			{ ...validTransaction, type: BigInt(8) },
			{ ...validTransaction, nonce: 1 },
			{ ...validTransaction, fee: 1000000 },
			{ ...validTransaction, senderPublicKey: 1 },
		];
		return invalidTransactionObjects.forEach(transactionObject =>
			expect(validateTransactionSchema(validAssetSchema, transactionObject)).toBeInstanceOf(Error),
		);
	});

	it('should return error when asset is null', () => {
		return expect(
			validateTransactionSchema(validAssetSchema, { ...validTransaction, asset: null }),
		).toEqual(new Error('Transaction object asset must be of type object and not null'));
	});

	it('should return error for invalid asset property', () => {
		const invalidAssets = [
			{ ...validTransaction, asset: { ...validTransaction.asset, amount: 1000 } },
			{
				...validTransaction,
				asset: { ...validTransaction.asset, recipientAddress: 'dummyAddress' },
			},
		];
		return invalidAssets.forEach(transactionObject =>
			expect(validateTransactionSchema(validAssetSchema, transactionObject)).toBeInstanceOf(Error),
		);
	});

	it('should return undefined for valid transaction object', () => {
		return expect(validateTransactionSchema(validAssetSchema, validTransaction)).toBeUndefined();
	});
});
