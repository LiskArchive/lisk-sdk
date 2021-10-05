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
import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import {
	getSigningBytes,
	signTransaction,
	signTransactionWithPrivateKey,
	signMultiSignatureTransaction,
	signMultiSignatureTransactionWithPrivateKey,
} from '../src/sign';
import * as multisigScenario from '../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';
import { baseTransactionSchema } from '../src/schema';

interface Transaction {
	asset: Buffer;
	signatures: Buffer[];
}

interface MultiSignatureAsset {
	mandatoryKeys: Array<Buffer>;
	optionalKeys: Array<Buffer>;
	numberOfSignatures: number;
}

describe('sign', () => {
	// Arrange
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

	const multisigRegAsset = {
		$id: '/multisignature/registrationAsset',
		type: 'object',
		properties: {
			numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
			mandatoryKeys: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 2,
			},
			optionalKeys: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 3,
			},
		},
		required: ['numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
	};

	const networkIdentifier = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);
	const passphrase1 = 'trim elegant oven term access apple obtain error grain excite lawn neck';
	const passphrase2 =
		'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic';
	const passphrase3 =
		'sugar object slender confirm clock peanut auto spice carbon knife increase estate';
	const passphrase4 = 'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb';
	const privateKey = Buffer.from(
		'2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		'hex',
	);
	const { publicKey: publicKey1 } = getAddressAndPublicKeyFromPassphrase(passphrase1);
	const { publicKey: publicKey2 } = getAddressAndPublicKeyFromPassphrase(passphrase2);
	const { publicKey: publicKey3 } = getAddressAndPublicKeyFromPassphrase(passphrase3);
	const { publicKey: publicKey4 } = getAddressAndPublicKeyFromPassphrase(passphrase4);
	const keys = {
		mandatoryKeys: [publicKey1, publicKey2],
		optionalKeys: [publicKey3, publicKey4],
	};

	const validTransaction = {
		moduleID: 2,
		assetID: 0,
		nonce: BigInt('1'),
		fee: BigInt('10000000'),
		senderPublicKey: publicKey1,
		asset: {
			recipientAddress: Buffer.from('3a971fd02b4a07fc20aad1936d3cb1d263b96e0f', 'hex'),
			amount: BigInt('4008489300000000'),
			data: '',
		},
	};

	describe('getSigningBytes', () => {
		it('should throw error for invalid transaction object', () => {
			const invalidTransactionObjects = [
				{ ...validTransaction, moduleID: BigInt(8) },
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
			const decodedTransaction = codec.decode<object>(baseTransactionSchema, signingBytes);
			const decodedAsset = codec.decode<object>(
				validAssetSchema,
				(decodedTransaction as any).asset,
			);
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
				{ ...validTransaction, moduleID: BigInt(8) },
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

	describe('signTransactionWithPrivateKey', () => {
		it('should throw error for invalid network identifier', () => {
			expect(() =>
				signTransactionWithPrivateKey(
					validAssetSchema,
					validTransaction,
					Buffer.alloc(0),
					privateKey,
				),
			).toThrow('Network identifier is required to sign a transaction');
		});

		it('should throw error for empty private key', () => {
			expect(() =>
				signTransactionWithPrivateKey(
					validAssetSchema,
					validTransaction,
					networkIdentifier,
					Buffer.alloc(0),
				),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error for private key with invalid length', () => {
			expect(() =>
				signTransactionWithPrivateKey(
					validAssetSchema,
					validTransaction,
					networkIdentifier,
					Buffer.from('invalid', 'utf8'),
				),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error for invalid transaction object', () => {
			const invalidTransactionObjects = [
				{ ...validTransaction, moduleID: BigInt(8) },
				{ ...validTransaction, nonce: 1 },
				{ ...validTransaction, fee: 1000000 },
				{ ...validTransaction, senderPublicKey: 1 },
			];
			return invalidTransactionObjects.forEach(transactionObject =>
				expect(() =>
					signTransactionWithPrivateKey(
						validAssetSchema,
						transactionObject,
						networkIdentifier,
						privateKey,
					),
				).toThrow(),
			);
		});

		it('should throw error when asset is null', () => {
			return expect(() =>
				signTransactionWithPrivateKey(
					validAssetSchema,
					{ ...validTransaction, asset: null },
					networkIdentifier,
					privateKey,
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
					signTransactionWithPrivateKey(
						validAssetSchema,
						transactionObject,
						networkIdentifier,
						privateKey,
					),
				).toThrow(),
			);
		});

		it('should return signed transaction for given asset schema', () => {
			const signedTransaction = signTransactionWithPrivateKey(
				validAssetSchema,
				{ ...validTransaction },
				networkIdentifier,
				privateKey,
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
	});

	describe('signMultiSignatureTransactionWithPrivateKey', () => {
		it('should throw error for invalid network identifier', () => {
			expect(() =>
				signMultiSignatureTransactionWithPrivateKey(
					validAssetSchema,
					{ ...validTransaction },
					Buffer.alloc(0),
					privateKey,
					keys,
				),
			).toThrow('Network identifier is required to sign a transaction');
		});

		it('should throw error for empty private key', () => {
			expect(() =>
				signMultiSignatureTransactionWithPrivateKey(
					validAssetSchema,
					{ ...validTransaction },
					networkIdentifier,
					Buffer.alloc(0),
					keys,
				),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error for private key with invalid length', () => {
			expect(() =>
				signMultiSignatureTransactionWithPrivateKey(
					validAssetSchema,
					{ ...validTransaction },
					networkIdentifier,
					Buffer.from('invalid', 'utf8'),
					keys,
				),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error when signatures property is not an array', () => {
			expect(() =>
				signMultiSignatureTransactionWithPrivateKey(
					validAssetSchema,
					{ ...validTransaction },
					networkIdentifier,
					privateKey,
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
					signMultiSignatureTransactionWithPrivateKey(
						validAssetSchema,
						transactionObject,
						networkIdentifier,
						privateKey,
						keys,
					),
				).toThrow(),
			);
		});

		it('should throw error when asset is null', () => {
			return expect(() =>
				signMultiSignatureTransactionWithPrivateKey(
					validAssetSchema,
					{ ...validTransaction, signatures: [], asset: null },
					networkIdentifier,
					privateKey,
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
					signMultiSignatureTransactionWithPrivateKey(
						validAssetSchema,
						transactionObject,
						networkIdentifier,
						privateKey,
						keys,
					),
				).toThrow(),
			);
		});
	});

	describe(`when running scenario "${multisigScenario.handler}"`, () => {
		multisigScenario.testCases.forEach((testCase: any) => {
			describe(testCase.description, () => {
				it('should have correct signatures', () => {
					const decodedBaseTransaction = codec.decode<Transaction>(
						baseTransactionSchema,
						Buffer.from(testCase.output.transaction, 'hex'),
					);
					const decodedAsset = codec.decode<MultiSignatureAsset>(
						multisigRegAsset,
						decodedBaseTransaction.asset,
					);
					const { signatures, ...transactionObject } = decodedBaseTransaction;
					const _networkIdentifier = Buffer.from(testCase.input.networkIdentifier, 'hex');
					const signedMultiSigTransaction = {
						...transactionObject,
						asset: { ...decodedAsset },
						signatures: [],
					};
					const senderAccount = {
						passphrase: 'inherit moon normal relief spring bargain hobby join baby flash fog blood',
						privateKey:
							'de4a28610239ceac2ec3f592e36a2ead8ed4ac93cb16aa0d996ab6bb0249da2c0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
						publicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
						address: 'be046d336cd0c2fbde62bc47e20199395d2eeadc',
					};

					Object.values({ senderAccount, ...testCase.input.members }).forEach((member: any) =>
						signMultiSignatureTransaction(
							multisigRegAsset,
							signedMultiSigTransaction,
							_networkIdentifier,
							member.passphrase,
							decodedAsset,
							true,
						),
					);

					expect(signedMultiSigTransaction.signatures).toStrictEqual(signatures);
					expect(signMultiSignatureTransaction).toMatchSnapshot();
				});
			});
		});
	});

	describe('when signing multisignature register transaction where sender is member', () => {
		it('should have correct signatures', () => {
			const testCase = multisigScenario.testCases[1];
			const decodedBaseTransaction = codec.decode<Transaction>(
				baseTransactionSchema,
				Buffer.from(testCase.output.transaction, 'hex'),
			);
			const decodedAsset = codec.decode<MultiSignatureAsset>(
				multisigRegAsset,
				decodedBaseTransaction.asset,
			);
			const { signatures, ...transactionObject } = decodedBaseTransaction;
			const signedMultiSigTransaction = {
				...transactionObject,
				asset: { ...decodedAsset },
				signatures: signatures.slice(0, 1),
			};
			const senderAccount = {
				passphrase: 'inherit moon normal relief spring bargain hobby join baby flash fog blood',
				privateKey:
					'de4a28610239ceac2ec3f592e36a2ead8ed4ac93cb16aa0d996ab6bb0249da2c0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				publicKey: '0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
				address: 'be046d336cd0c2fbde62bc47e20199395d2eeadc',
			};
			const _networkIdentifier = Buffer.from(testCase.input.networkIdentifier, 'hex');

			Object.values({ senderAccount, ...testCase.input.members }).forEach((member: any) =>
				signMultiSignatureTransaction(
					multisigRegAsset,
					signedMultiSigTransaction,
					_networkIdentifier,
					member.passphrase,
					decodedAsset,
					true,
				),
			);

			expect(signedMultiSigTransaction.signatures).toStrictEqual(signatures);
			expect(signedMultiSigTransaction.signatures.every(s => s.length > 0)).toBeTrue();
		});
	});
});
