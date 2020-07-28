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

import { codec } from '@liskhq/lisk-codec';
import { getAddressAndPublicKeyFromPassphrase, signData } from '@liskhq/lisk-cryptography';
import { getSigningBytes, signTransaction, signMultiSignatureTransaction } from '../src/sign';
import { BaseTransaction } from '../src';
// import * as multisigFixture from '../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';

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
const passphrase2 = 'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic';
const passphrase3 =
	'sugar object slender confirm clock peanut auto spice carbon knife increase estate';
const passphrase4 = 'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb';
const { publicKey: publicKey1 } = getAddressAndPublicKeyFromPassphrase(passphrase1);
const { publicKey: publicKey2 } = getAddressAndPublicKeyFromPassphrase(passphrase2);
const { publicKey: publicKey3 } = getAddressAndPublicKeyFromPassphrase(passphrase3);
const { publicKey: publicKey4 } = getAddressAndPublicKeyFromPassphrase(passphrase4);
const keys = {
	mandatoryKeys: [publicKey1, publicKey2],
	optionalKeys: [publicKey3, publicKey4],
};

const validTransaction = {
	type: 8,
	nonce: BigInt('1'),
	fee: BigInt('10000000'),
	senderPublicKey: publicKey1,
	asset: {
		recipientAddress: Buffer.from('3a971fd02b4a07fc20aad1936d3cb1d263b96e0f', 'hex'),
		amount: BigInt('4008489300000000'),
		data: '',
	},
};

const getSignature = (
	passphrase: string,
	transactionObject: Record<string, unknown>,
	assetSchema = validAssetSchema,
) => {
	const transactionWithNetworkIdentifierBytes = Buffer.concat([
		networkIdentifier,
		getSigningBytes(assetSchema, transactionObject),
	]);

	return signData(transactionWithNetworkIdentifierBytes, passphrase);
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

	it('should return transaction bytes for given asset', () => {
		const signingBytes = getSigningBytes(validAssetSchema, { ...validTransaction });
		expect(signingBytes).toMatchSnapshot();
		const decodedTransaction = codec.decode<object>(BaseTransaction.BASE_SCHEMA, signingBytes);
		const decodedAsset = codec.decode<object>(validAssetSchema, (decodedTransaction as any).asset);
		return expect({ ...decodedTransaction, asset: { ...decodedAsset } }).toEqual({
			...validTransaction,
			signatures: [],
		});
	});
});

describe('signTransaction', () => {
	it('should throw error for invalid network identifier', () => {
		expect(() =>
			signTransaction(validAssetSchema, validTransaction, Buffer.alloc(0), passphrase1),
		).toThrow('Network identifier is required to sign a transaction');
	});

	it('should throw error for invalid passphrase', () => {
		expect(() =>
			signTransaction(validAssetSchema, validTransaction, networkIdentifier, ''),
		).toThrow('Passphrase is required to sign a transaction');
	});

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

	it('should throw error when transaction senderPublicKey does not match public key from passphrase', () => {
		return expect(() =>
			signTransaction(
				validAssetSchema,
				validTransaction,
				networkIdentifier,
				'this is incorrect passphrase',
			),
		).toThrow('Transaction senderPublicKey does not match public key from passphrase');
	});

	it('should return signed transaction for given asset schema', () => {
		const signedTransaction = signTransaction(
			validAssetSchema,
			{ ...validTransaction },
			networkIdentifier,
			passphrase1,
		);
		expect((signedTransaction.signatures as Array<Buffer>)[0].length).toBeGreaterThan(0);
		expect(signedTransaction.signatures).toHaveLength(1);
		return expect(signedTransaction).toMatchSnapshot();
	});
});

describe('signMultiSignatureTransaction', () => {
	it('should throw error for invalid network identifier', () => {
		expect(() =>
			signMultiSignatureTransaction(
				validAssetSchema,
				{ ...validTransaction },
				Buffer.alloc(0),
				passphrase1,
				keys,
			),
		).toThrow('Network identifier is required to sign a transaction');
	});

	it('should throw error for invalid passphrase', () => {
		expect(() =>
			signMultiSignatureTransaction(
				validAssetSchema,
				{ ...validTransaction },
				networkIdentifier,
				'',
				keys,
			),
		).toThrow('Passphrase is required to sign a transaction');
	});

	it('should throw error when signatures property is not an array', () => {
		expect(() =>
			signMultiSignatureTransaction(
				validAssetSchema,
				{ ...validTransaction },
				networkIdentifier,
				passphrase1,
				keys,
			),
		).toThrow('Signatures must be of type array');
	});

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
				{ ...validTransaction, signatures: [], asset: null },
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

	it('should sign and include sender signature at position zero for given sender passphrase', () => {
		const senderTransaction = signMultiSignatureTransaction(
			validAssetSchema,
			{ ...validTransaction, signatures: [] },
			networkIdentifier,
			passphrase1,
			keys,
			true,
		);

		expect(senderTransaction.signatures).toStrictEqual([
			getSignature(passphrase1, senderTransaction),
			Buffer.alloc(0),
			Buffer.alloc(0),
			Buffer.alloc(0),
			Buffer.alloc(0),
		]);
		expect(senderTransaction.signatures).toHaveLength(5);
		return expect(senderTransaction).toMatchSnapshot();
	});

	it('should assign empty string for signatures of missing passphrases', () => {
		const signedTransaction = signMultiSignatureTransaction(
			validAssetSchema,
			{ ...validTransaction, signatures: [] },
			networkIdentifier,
			passphrase2,
			keys,
			true,
		);
		const partialSignedTransaction = signMultiSignatureTransaction(
			validAssetSchema,
			{ ...signedTransaction, signatures: [...(signedTransaction.signatures as Array<Buffer>)] },
			networkIdentifier,
			passphrase3,
			keys,
			true,
		);

		expect(signedTransaction.signatures).toHaveLength(5);
		expect(partialSignedTransaction.signatures).toHaveLength(5);
		expect(signedTransaction.signatures).toStrictEqual([
			Buffer.alloc(0),
			getSignature(passphrase2, signedTransaction),
			Buffer.alloc(0),
			Buffer.alloc(0),
			Buffer.alloc(0),
		]);
		expect(partialSignedTransaction.signatures).toStrictEqual([
			Buffer.alloc(0),
			getSignature(passphrase2, signedTransaction),
			Buffer.alloc(0),
			getSignature(passphrase3, partialSignedTransaction),
			Buffer.alloc(0),
		]);
		expect(signedTransaction).toMatchSnapshot();
		return expect(partialSignedTransaction).toMatchSnapshot();
	});

	it('should sort keys and sign transaction', () => {
		const unSortedKeys = {
			mandatoryKeys: [publicKey1, publicKey2],
			optionalKeys: [publicKey4, publicKey3],
		};
		const transactionObject = { ...validTransaction, signatures: [] };
		const unSignedTransaction = { ...validTransaction, signatures: [] };

		[passphrase1, passphrase2, passphrase3, passphrase4].forEach(passphrase =>
			signMultiSignatureTransaction(
				validAssetSchema,
				transactionObject,
				networkIdentifier,
				passphrase,
				unSortedKeys,
				true,
			),
		);

		expect(transactionObject.signatures).toStrictEqual([
			getSignature(passphrase1, unSignedTransaction),
			getSignature(passphrase2, unSignedTransaction),
			Buffer.alloc(0),
			getSignature(passphrase3, unSignedTransaction),
			getSignature(passphrase4, unSignedTransaction),
		]);
		return expect(transactionObject).toMatchSnapshot();
	});
});
