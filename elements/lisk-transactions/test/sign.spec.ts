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
import { ed, legacy } from '@liskhq/lisk-cryptography';
import { getSigningBytes, signTransaction, signMultiSignatureTransaction } from '../src/sign';
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
		$id: '/lisk/transferTransaction',
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

	const multisigRegParamsSchema = {
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
			signatures: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 4,
			},
		},
		required: ['numberOfSignatures', 'mandatoryKeys', 'optionalKeys', 'signatures'],
	};

	const chainID = Buffer.from('00000000', 'hex');
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
	const { publicKey: publicKey1 } = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase1);
	const { publicKey: publicKey2 } = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase2);
	const { publicKey: publicKey3 } = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase3);
	const { publicKey: publicKey4 } = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase4);
	const keys = {
		mandatoryKeys: [publicKey1, publicKey2],
		optionalKeys: [publicKey3, publicKey4],
	};

	const validTransaction = {
		module: 'token',
		command: 'transfer',
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
				{ ...validTransaction, module: BigInt(2) },
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
				signTransaction(validTransaction, Buffer.alloc(0), privateKey, validParamsSchema),
			).toThrow('ChainID is required to sign a transaction');
		});

		it('should throw error for empty private key', () => {
			expect(() =>
				signTransaction(validTransaction, chainID, Buffer.alloc(0), validParamsSchema),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error for private key with invalid length', () => {
			expect(() =>
				signTransaction(
					validTransaction,
					chainID,
					Buffer.from('invalid', 'utf8'),
					validParamsSchema,
				),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error for invalid transaction object', () => {
			const invalidTransactionObjects = [
				{ ...validTransaction, module: BigInt(8) },
				{ ...validTransaction, nonce: 1 },
				{ ...validTransaction, fee: 1000000 },
				{ ...validTransaction, senderPublicKey: 1 },
			];
			return invalidTransactionObjects.forEach(transactionObject =>
				expect(() =>
					signTransaction(transactionObject, chainID, privateKey, validParamsSchema),
				).toThrow(),
			);
		});

		it('should throw error when params is null', () => {
			return expect(() =>
				signTransaction(
					{ ...validTransaction, params: null },
					chainID,
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
					signTransaction(transactionObject, chainID, privateKey, validParamsSchema),
				).toThrow(),
			);
		});

		it('should return signed transaction for given params schema', () => {
			const signedTransaction = signTransaction(
				{ ...validTransaction },
				chainID,
				privateKey,
				validParamsSchema,
			);
			expect((signedTransaction.signatures as Array<Buffer>)[0].length).toBeGreaterThan(0);
			expect(signedTransaction.signatures).toHaveLength(1);
			return expect(signedTransaction).toMatchSnapshot();
		});

		it('should return a signed transaction for an undefined params schema', () => {
			const signedTransaction = signTransaction(
				{ ...validTransaction, params: undefined },
				chainID,
				privateKey,
				undefined,
			);

			expect((signedTransaction.signatures as Array<Buffer>)[0].length).toBeGreaterThan(0);
			expect(signedTransaction.signatures).toHaveLength(1);
		});

		it('should return a signed transaction for an empty params object', () => {
			const signedTransaction = signTransaction(
				{ ...validTransaction, params: {} },
				chainID,
				privateKey,
				undefined,
			);

			expect((signedTransaction.signatures as Array<Buffer>)[0].length).toBeGreaterThan(0);
			expect(signedTransaction.signatures).toHaveLength(1);
		});
	});

	describe('signMultiSignatureTransaction', () => {
		it('should throw error for invalid network identifier', () => {
			expect(() =>
				signMultiSignatureTransaction(
					{ ...validTransaction, signatures: [] },
					Buffer.alloc(0),
					privateKey,
					keys,
					validParamsSchema,
				),
			).toThrow('ChainID is required to sign a transaction');
		});

		it('should throw error for empty private key', () => {
			expect(() =>
				signMultiSignatureTransaction(
					{ ...validTransaction, signatures: [] },
					chainID,
					Buffer.alloc(0),
					keys,
					validParamsSchema,
				),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error for private key with invalid length', () => {
			expect(() =>
				signMultiSignatureTransaction(
					{ ...validTransaction },
					chainID,
					Buffer.from('invalid', 'utf8'),
					keys,
					validParamsSchema,
				),
			).toThrow('Private key must be 64 bytes');
		});

		it('should throw error when signatures property is not an array', () => {
			expect(() =>
				signMultiSignatureTransaction(
					{ ...validTransaction },
					chainID,
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
					signMultiSignatureTransaction(
						transactionObject,
						chainID,
						privateKey,
						keys,
						validParamsSchema,
					),
				).toThrow(),
			);
		});

		it('should throw error when params is null', () => {
			return expect(() =>
				signMultiSignatureTransaction(
					{ ...validTransaction, signatures: [], params: null },
					chainID,
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
					signMultiSignatureTransaction(
						transactionObject,
						chainID,
						privateKey,
						keys,
						validParamsSchema,
					),
				).toThrow(),
			);
		});

		it('should match the signatures of the mandatory keys in right order for transfer trx', () => {
			const account1 = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase1);
			const account2 = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase2);
			// Sender public key of account1
			const transaction = {
				module: 'token',
				command: 'transfer',
				nonce: BigInt('1'),
				fee: BigInt('10000000'),
				senderPublicKey: account1.publicKey,
				signatures: [],
				params: {
					recipientAddress: Buffer.from('3a971fd02b4a07fc20aad1936d3cb1d263b96e0f', 'hex'),
					amount: BigInt('4008489300000000'),
					data: '',
				},
			};

			// Sign with the senderPublic key of the transaction
			const signedTransaction = signMultiSignatureTransaction(
				transaction,
				chainID,
				account1.privateKey,
				{ mandatoryKeys: [account2.publicKey, account1.publicKey], optionalKeys: [] },
				validParamsSchema,
			);

			const signature = ed.signDataWithPrivateKey(
				TAG_TRANSACTION,
				chainID,
				getSigningBytes(transaction, validParamsSchema),
				account1.privateKey,
			);

			// Sign with the mandatory key of the multi-signature account
			const signedTransactionMandatoryKey = signMultiSignatureTransaction(
				signedTransaction,
				chainID,
				account2.privateKey,
				{ mandatoryKeys: [account2.publicKey, account1.publicKey], optionalKeys: [] },
				validParamsSchema,
			);

			const signatureMandatoryAccount = ed.signDataWithPrivateKey(
				TAG_TRANSACTION,
				chainID,
				getSigningBytes(signedTransaction, validParamsSchema),
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
						multisigRegParamsSchema,
						decodedBaseTransaction.params,
					);
					const registerMultisigTransaction = {
						...decodedBaseTransaction,
						params: decodedParams,
						signatures: [],
					};
					const senderAccount = testCase.input.account;

					const signaturesResult = signTransaction(
						registerMultisigTransaction,
						Buffer.from(testCase.input.chainID, 'hex'),
						Buffer.from(senderAccount.privateKey, 'hex'),
						multisigRegParamsSchema,
					).signatures;

					expect(signaturesResult).toStrictEqual(decodedBaseTransaction.signatures);
					expect(registerMultisigTransaction).toMatchSnapshot();
				});
			});
		});
	});
});
