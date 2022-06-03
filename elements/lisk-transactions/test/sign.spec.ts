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
import {
	getAddressAndPublicKeyFromPassphrase,
	getPrivateAndPublicKeyFromPassphrase,
	signDataWithPrivateKey,
} from '@liskhq/lisk-cryptography';
import {
	getSigningBytes,
	signTransaction,
	signTransactionWithPrivateKey,
	signMultiSignatureTransaction,
	signMultiSignatureTransactionWithPrivateKey,
} from '../src/sign';
import * as multisigScenario from '../fixtures/transaction_multisignature_registration/multisignature_registration_transaction.json';
import { baseTransactionSchema } from '../src/schema';
import { TAG_TRANSACTION } from '../src';

interface Transaction {
	params: Buffer;
	signatures: Buffer[];
}

interface MultiSignatureParams {
	mandatoryKeys: Array<Buffer>;
	optionalKeys: Array<Buffer>;
	numberOfSignatures: number;
}

describe('sign', () => {
	// Arrange
	const validParamsSchema = {
		$id: 'lisk/transfer-transaction',
		title: 'Transfer transaction params',
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

	const multisigRegParams = {
		$id: '/multisignature/registrationParams',
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
		commandID: 0,
		nonce: BigInt('1'),
		fee: BigInt('10000000'),
		senderPublicKey: publicKey1,
		params: {
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
				expect(() => getSigningBytes(transactionObject, validParamsSchema)).toThrow(),
			);
		});

		it('should throw error when params is null', () => {
			return expect(() =>
				getSigningBytes({ ...validTransaction, params: null }, validParamsSchema),
			).toThrow(new Error('Transaction object params must be of type object and not null'));
		});

		it('should throw error for invalid params object', () => {
			const invalidParams = [
				{ ...validTransaction, params: { ...validTransaction.params, amount: 1000 } },
				{
					...validTransaction,
					params: { ...validTransaction.params, recipientAddress: 'dummyAddress' },
				},
			];
			return invalidParams.forEach(transactionObject =>
				expect(() => getSigningBytes(transactionObject, validParamsSchema)).toThrow(),
			);
		});

		it('should return transaction bytes for given params', () => {
			const signingBytes = getSigningBytes({ ...validTransaction }, validParamsSchema);
			expect(signingBytes).toMatchSnapshot();
			const decodedTransaction = codec.decode<object>(baseTransactionSchema, signingBytes);
			const decodedParams = codec.decode<object>(
				validParamsSchema,
				(decodedTransaction as any).params,
			);
			return expect({ ...decodedTransaction, params: { ...decodedParams } }).toEqual({
				...validTransaction,
				signatures: [],
			});
		});
	});

	describe('signTransaction', () => {
		it('should throw error for invalid network identifier', () => {
			expect(() =>
				signTransaction(validTransaction, Buffer.alloc(0), passphrase1, validParamsSchema),
			).toThrow('Network identifier is required to sign a transaction');
		});

		it('should throw error for invalid passphrase', () => {
			expect(() =>
				signTransaction(validTransaction, networkIdentifier, '', validParamsSchema),
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
					signTransaction(transactionObject, networkIdentifier, passphrase1, validParamsSchema),
				).toThrow(),
			);
		});

		it('should throw error when params is null', () => {
			return expect(() =>
				signTransaction(
					{ ...validTransaction, params: null },
					networkIdentifier,
					passphrase1,
					validParamsSchema,
				),
			).toThrow(new Error('Transaction object params must be of type object and not null'));
		});

		it('should throw error for invalid params object', () => {
			const invalidParams = [
				{ ...validTransaction, params: { ...validTransaction.params, amount: 1000 } },
				{
					...validTransaction,
					params: { ...validTransaction.params, recipientAddress: 'dummyAddress' },
				},
			];
			return invalidParams.forEach(transactionObject =>
				expect(() =>
					signTransaction(transactionObject, networkIdentifier, passphrase1, validParamsSchema),
				).toThrow(),
			);
		});

		it('should throw error when transaction senderPublicKey does not match public key from passphrase', () => {
			return expect(() =>
				signTransaction(
					validTransaction,
					networkIdentifier,
					'this is incorrect passphrase',
					validParamsSchema,
				),
			).toThrow('Transaction senderPublicKey does not match public key from passphrase');
		});

		it('should return signed transaction for given params schema', () => {
			const signedTransaction = signTransaction(
				{ ...validTransaction },
				networkIdentifier,
				passphrase1,
				validParamsSchema,
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
					validTransaction,
					Buffer.alloc(0),
					privateKey,
					validParamsSchema,
				),
			).toThrow('Network identifier is required to sign a transaction');
		});

		it('should throw error for empty private key', () => {
			expect(() =>
				signTransactionWithPrivateKey(
					validTransaction,
					networkIdentifier,
					Buffer.alloc(0),
					validParamsSchema,
				),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error for private key with invalid length', () => {
			expect(() =>
				signTransactionWithPrivateKey(
					validTransaction,
					networkIdentifier,
					Buffer.from('invalid', 'utf8'),
					validParamsSchema,
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
						transactionObject,
						networkIdentifier,
						privateKey,
						validParamsSchema,
					),
				).toThrow(),
			);
		});

		it('should throw error when params is null', () => {
			return expect(() =>
				signTransactionWithPrivateKey(
					{ ...validTransaction, params: null },
					networkIdentifier,
					privateKey,
					validParamsSchema,
				),
			).toThrow(new Error('Transaction object params must be of type object and not null'));
		});

		it('should throw error for invalid params object', () => {
			const invalidParams = [
				{ ...validTransaction, params: { ...validTransaction.params, amount: 1000 } },
				{
					...validTransaction,
					params: { ...validTransaction.params, recipientAddress: 'dummyAddress' },
				},
			];
			return invalidParams.forEach(transactionObject =>
				expect(() =>
					signTransactionWithPrivateKey(
						transactionObject,
						networkIdentifier,
						privateKey,
						validParamsSchema,
					),
				).toThrow(),
			);
		});

		it('should return signed transaction for given params schema', () => {
			const signedTransaction = signTransactionWithPrivateKey(
				{ ...validTransaction },
				networkIdentifier,
				privateKey,
				validParamsSchema,
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
					{ ...validTransaction },
					Buffer.alloc(0),
					passphrase1,
					keys,
					validParamsSchema,
				),
			).toThrow('Network identifier is required to sign a transaction');
		});

		it('should throw error for invalid passphrase', () => {
			expect(() =>
				signMultiSignatureTransaction(
					{ ...validTransaction },
					networkIdentifier,
					'',
					keys,
					validParamsSchema,
				),
			).toThrow('Passphrase is required to sign a transaction');
		});

		it('should throw error when signatures property is not an array', () => {
			expect(() =>
				signMultiSignatureTransaction(
					{ ...validTransaction },
					networkIdentifier,
					passphrase1,
					keys,
					validParamsSchema,
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
						transactionObject,
						networkIdentifier,
						passphrase1,
						keys,
						validParamsSchema,
					),
				).toThrow(),
			);
		});

		it('should throw error for invalid params object', () => {
			const invalidParams = [
				{ ...validTransaction, params: { ...validTransaction.params, amount: 1000 } },
				{
					...validTransaction,
					params: { ...validTransaction.params, recipientAddress: 'dummyAddress' },
				},
			];
			return invalidParams.forEach(transactionObject =>
				expect(() =>
					signMultiSignatureTransaction(
						transactionObject,
						networkIdentifier,
						passphrase1,
						keys,
						validParamsSchema,
					),
				).toThrow(),
			);
		});
	});

	describe('signMultiSignatureTransactionWithPrivateKey', () => {
		it('should throw error for invalid network identifier', () => {
			expect(() =>
				signMultiSignatureTransactionWithPrivateKey(
					{ ...validTransaction },
					Buffer.alloc(0),
					privateKey,
					keys,
					validParamsSchema,
				),
			).toThrow('Network identifier is required to sign a transaction');
		});

		it('should throw error for empty private key', () => {
			expect(() =>
				signMultiSignatureTransactionWithPrivateKey(
					{ ...validTransaction },
					networkIdentifier,
					Buffer.alloc(0),
					keys,
					validParamsSchema,
				),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error for private key with invalid length', () => {
			expect(() =>
				signMultiSignatureTransactionWithPrivateKey(
					{ ...validTransaction },
					networkIdentifier,
					Buffer.from('invalid', 'utf8'),
					keys,
					validParamsSchema,
				),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error when signatures property is not an array', () => {
			expect(() =>
				signMultiSignatureTransactionWithPrivateKey(
					{ ...validTransaction },
					networkIdentifier,
					privateKey,
					keys,
					validParamsSchema,
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
						transactionObject,
						networkIdentifier,
						privateKey,
						keys,
						validParamsSchema,
					),
				).toThrow(),
			);
		});

		it('should throw error when params is null', () => {
			return expect(() =>
				signMultiSignatureTransactionWithPrivateKey(
					{ ...validTransaction, signatures: [], params: null },
					networkIdentifier,
					privateKey,
					keys,
					validParamsSchema,
				),
			).toThrow(new Error('Transaction object params must be of type object and not null'));
		});

		it('should throw error for invalid params object', () => {
			const invalidParams = [
				{ ...validTransaction, params: { ...validTransaction.params, amount: 1000 } },
				{
					...validTransaction,
					params: { ...validTransaction.params, recipientAddress: 'dummyAddress' },
				},
			];
			return invalidParams.forEach(transactionObject =>
				expect(() =>
					signMultiSignatureTransactionWithPrivateKey(
						transactionObject,
						networkIdentifier,
						privateKey,
						keys,
						validParamsSchema,
					),
				).toThrow(),
			);
		});

		it('should add sender and mandatory public key signatures in right order for multisignature registration trx', () => {
			const account1 = getPrivateAndPublicKeyFromPassphrase(passphrase1);
			const account2 = getPrivateAndPublicKeyFromPassphrase(passphrase2);
			const account3 = getPrivateAndPublicKeyFromPassphrase(passphrase3);
			const mandatoryKeys = [account1.publicKey, account2.publicKey];
			const optionalKeys = [account3.publicKey];

			const multisignatureRegistrationTrx = {
				moduleID: 4,
				commandID: 0,
				nonce: BigInt('1'),
				fee: BigInt('10000000'),
				senderPublicKey: account1.publicKey,
				params: {
					mandatoryKeys,
					optionalKeys,
					numberOfSignatures: 2,
				},
			};
			const transactionObject = { ...multisignatureRegistrationTrx, signatures: [] };

			// Sign with the senderPublic key sender of the transaction
			const signedTransaction = signMultiSignatureTransactionWithPrivateKey(
				transactionObject,
				networkIdentifier,
				account1.privateKey,
				{ mandatoryKeys, optionalKeys },
				multisigRegParams,
				true,
			);
			const transactionWithNetworkIdentifierBytes = Buffer.concat([
				networkIdentifier,
				getSigningBytes(transactionObject, multisigRegParams),
			]);

			// Signing with non sender second mandatory key
			const signedTransactionNonSender = signMultiSignatureTransactionWithPrivateKey(
				signedTransaction,
				networkIdentifier,
				account2.privateKey,
				{ mandatoryKeys, optionalKeys },
				multisigRegParams,
				true,
			);
			const transactionWithNetworkIdentifierBytesNonSender = Buffer.concat([
				networkIdentifier,
				getSigningBytes(signedTransaction, multisigRegParams),
			]);

			const signature = signDataWithPrivateKey(
				TAG_TRANSACTION,
				networkIdentifier,
				transactionWithNetworkIdentifierBytes,
				account1.privateKey,
			);
			const signatureNonSender = signDataWithPrivateKey(
				TAG_TRANSACTION,
				networkIdentifier,
				transactionWithNetworkIdentifierBytesNonSender,
				account2.privateKey,
			);

			expect((signedTransactionNonSender as any).signatures[0]).toEqual(signature);
			expect((signedTransactionNonSender as any).signatures[1]).toEqual(signatureNonSender);
			expect((signedTransactionNonSender as any).signatures[2]).toEqual(signature);
		});

		it('should match the signatures of the mandatory keys in right order for transfer trx', () => {
			const account1 = getPrivateAndPublicKeyFromPassphrase(passphrase1);
			const account2 = getPrivateAndPublicKeyFromPassphrase(passphrase2);
			// Sender public key of account1
			const transaction = {
				moduleID: 2,
				commandID: 0,
				nonce: BigInt('1'),
				fee: BigInt('10000000'),
				senderPublicKey: account1.publicKey,
				params: {
					recipientAddress: Buffer.from('3a971fd02b4a07fc20aad1936d3cb1d263b96e0f', 'hex'),
					amount: BigInt('4008489300000000'),
					data: '',
				},
			};

			const transactionObject = { ...transaction, signatures: [] };

			// Sign with the senderPublic key of the transaction
			const signedTransaction = signMultiSignatureTransactionWithPrivateKey(
				transactionObject,
				networkIdentifier,
				account1.privateKey,
				{ mandatoryKeys: [account2.publicKey, account1.publicKey], optionalKeys: [] },
				validParamsSchema,
			);
			const transactionWithNetworkIdentifierBytes = Buffer.concat([
				networkIdentifier,
				getSigningBytes(transactionObject, validParamsSchema),
			]);

			const signature = signDataWithPrivateKey(
				TAG_TRANSACTION,
				networkIdentifier,
				transactionWithNetworkIdentifierBytes,
				account1.privateKey,
			);

			// Sign with the mandatory key of the multi-signature account
			const signedTransactionMandatoryKey = signMultiSignatureTransactionWithPrivateKey(
				signedTransaction,
				networkIdentifier,
				account2.privateKey,
				{ mandatoryKeys: [account2.publicKey, account1.publicKey], optionalKeys: [] },
				validParamsSchema,
			);

			const transactionMandatoryKeyWithNetworkIdentifierBytes = Buffer.concat([
				networkIdentifier,
				getSigningBytes(signedTransaction, validParamsSchema),
			]);

			const signatureMandatoryAccount = signDataWithPrivateKey(
				TAG_TRANSACTION,
				networkIdentifier,
				transactionMandatoryKeyWithNetworkIdentifierBytes,
				account2.privateKey,
			);

			expect((signedTransactionMandatoryKey as any).signatures[0]).toEqual(
				signatureMandatoryAccount,
			);
			expect((signedTransactionMandatoryKey as any).signatures[1]).toEqual(signature);
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
					const decodedParams = codec.decode<MultiSignatureParams>(
						multisigRegParams,
						decodedBaseTransaction.params,
					);
					const { signatures, ...transactionObject } = decodedBaseTransaction;
					const _networkIdentifier = Buffer.from(testCase.input.networkIdentifier, 'hex');
					const signedMultiSigTransaction = {
						...transactionObject,
						params: { ...decodedParams },
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
							signedMultiSigTransaction,
							_networkIdentifier,
							member.passphrase,
							decodedParams,
							multisigRegParams,
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
			const decodedParams = codec.decode<MultiSignatureParams>(
				multisigRegParams,
				decodedBaseTransaction.params,
			);
			const { signatures, ...transactionObject } = decodedBaseTransaction;
			const signedMultiSigTransaction = {
				...transactionObject,
				params: { ...decodedParams },
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
					signedMultiSigTransaction,
					_networkIdentifier,
					member.passphrase,
					decodedParams,
					multisigRegParams,
					true,
				),
			);

			expect(signedMultiSigTransaction.signatures).toStrictEqual(signatures);
			expect(signedMultiSigTransaction.signatures.every(s => s.length > 0)).toBeTrue();
		});
	});
});
