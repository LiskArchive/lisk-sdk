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

import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { getSigningBytes, signTransaction, signMultiSignatureTransaction } from '../src/sign';

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
const networkIdentifier = Buffer.from(
	'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
	'base64',
);
const passphrase1 = 'trim elegant oven term access apple obtain error grain excite lawn neck';
const passphrase2 =
	'sugar object slender confirm clock peanut auto spice carbon knife increase estate';
const passphrase3 = 'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb';
const { publicKey: publicKey1 } = getAddressAndPublicKeyFromPassphrase(passphrase1);
const { publicKey: publicKey2 } = getAddressAndPublicKeyFromPassphrase(passphrase2);
const { publicKey: publicKey3 } = getAddressAndPublicKeyFromPassphrase(passphrase3);
const keys = {
	mandatoryKeys: [publicKey1, publicKey2],
	optionalKeys: [publicKey3],
};

describe('getSigningBytes', () => {
	it('should throw error for invalid transaction object', () => {
		const invalidTransactionObjects = [
			{ ...validTransaction, type: BigInt(8) },
			{ ...validTransaction, nonce: 1 },
			{ ...validTransaction, fee: 1000000 },
			{ ...validTransaction, senderPublicKey: 1 },
		];
		return invalidTransactionObjects.forEach(transactionObject =>
			expect(() => getSigningBytes(validAssetSchema, transactionObject)).toThrow(),
		);
	});

	it('should throw error when asset is null', () => {
		return expect(() =>
			getSigningBytes(validAssetSchema, { ...validTransaction, asset: null }),
		).toThrow(new Error('Transaction object asset must be of type object and not null'));
	});

	it('should throw error for invalid asset object', () => {
		const invalidAssets = [
			{ ...validTransaction, asset: { ...validTransaction.asset, amount: 1000 } },
			{
				...validTransaction,
				asset: { ...validTransaction.asset, recipientAddress: 'dummyAddress' },
			},
		];
		return invalidAssets.forEach(transactionObject =>
			expect(() => getSigningBytes(validAssetSchema, transactionObject)).toThrow(),
		);
	});
});

describe('signTransaction', () => {
	it('should throw error for invalid transaction object', () => {
		const invalidTransactionObjects = [
			{ ...validTransaction, type: BigInt(8) },
			{ ...validTransaction, nonce: 1 },
			{ ...validTransaction, fee: 1000000 },
			{ ...validTransaction, senderPublicKey: 1 },
		];
		return invalidTransactionObjects.forEach(transactionObject =>
			expect(() =>
				signTransaction(validAssetSchema, transactionObject, networkIdentifier, passphrase1),
			).toThrow(),
		);
	});

	it('should throw error when asset is null', () => {
		return expect(() =>
			signTransaction(
				validAssetSchema,
				{ ...validTransaction, asset: null },
				networkIdentifier,
				passphrase1,
			),
		).toThrow(new Error('Transaction object asset must be of type object and not null'));
	});

	it('should throw error for invalid asset object', () => {
		const invalidAssets = [
			{ ...validTransaction, asset: { ...validTransaction.asset, amount: 1000 } },
			{
				...validTransaction,
				asset: { ...validTransaction.asset, recipientAddress: 'dummyAddress' },
			},
		];
		return invalidAssets.forEach(transactionObject =>
			expect(() =>
				signTransaction(validAssetSchema, transactionObject, networkIdentifier, passphrase1),
			).toThrow(),
		);
	});
});

describe('signMultiSignatureTransaction', () => {
	it('should throw error for invalid transaction object', () => {
		const invalidTransactionObjects = [
			{ ...validTransaction, type: BigInt(8) },
			{ ...validTransaction, nonce: 1 },
			{ ...validTransaction, fee: 1000000 },
			{ ...validTransaction, senderPublicKey: 1 },
		];
		return invalidTransactionObjects.forEach(transactionObject =>
			expect(() =>
				signMultiSignatureTransaction(
					validAssetSchema,
					transactionObject,
					networkIdentifier,
					passphrase1,
					keys,
				),
			).toThrow(),
		);
	});

	it('should throw error when asset is null', () => {
		return expect(() =>
			signMultiSignatureTransaction(
				validAssetSchema,
				{ ...validTransaction, asset: null },
				networkIdentifier,
				passphrase1,
				keys,
			),
		).toThrow(new Error('Transaction object asset must be of type object and not null'));
	});

	it('should throw error for invalid asset object', () => {
		const invalidAssets = [
			{ ...validTransaction, asset: { ...validTransaction.asset, amount: 1000 } },
			{
				...validTransaction,
				asset: { ...validTransaction.asset, recipientAddress: 'dummyAddress' },
			},
		];
		return invalidAssets.forEach(transactionObject =>
			expect(() =>
				signMultiSignatureTransaction(
					validAssetSchema,
					transactionObject,
					networkIdentifier,
					passphrase1,
					keys,
				),
			).toThrow(),
		);
	});
});
