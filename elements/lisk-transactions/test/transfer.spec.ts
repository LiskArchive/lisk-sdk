/*
 * Copyright © 2019 Lisk Foundation
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
import * as cryptography from '@liskhq/lisk-cryptography';
import { transfer } from '../src/transfer';
import { TransactionJSON } from '../src/transaction_types';
import * as secondSignatureReg from '../fixtures/transaction_multisignature_registration/multisignature_registration_2nd_sig_equivalent_transaction.json';

describe('#transfer transaction', () => {
	const fixedPoint = 10 ** 8;
	const testData = 'data';
	const passphrase = 'secret';
	const transactionType = 8;
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const recipientId = '18160565574430594874L';
	const recipientPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const recipientPublicKeyThatDoesNotMatchRecipientId =
		'12345a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const amount = '1000';
	const fee = (0.1 * fixedPoint).toString();
	const nonce = '0';
	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	let transferTransaction: Partial<TransactionJSON>;

	describe('with single passphrase', () => {
		describe('without data', () => {
			beforeEach(() => {
				transferTransaction = transfer({
					recipientId,
					amount,
					networkIdentifier,
					passphrase,
					fee,
					nonce,
				});
			});

			it('should create a transfer transaction', () => {
				return expect(transferTransaction).toBeTruthy();
			});

			it('should be an object', () => {
				return expect(transferTransaction).toBeObject();
			});

			it('should have id string', () => {
				return expect(transferTransaction.id).toBeString();
			});

			it('should have type number equal to 0', () => {
				return expect(transferTransaction).toHaveProperty(
					'type',
					transactionType,
				);
			});

			it('should have amount string equal to provided amount', () => {
				return expect(transferTransaction.asset).toHaveProperty(
					'amount',
					amount,
				);
			});

			it('should have fee string equal to transfer fee', () => {
				return expect(transferTransaction).toHaveProperty('fee', fee);
			});

			it('should have nonce string equal to transfer nonce', () => {
				return expect(transferTransaction).toHaveProperty('nonce', nonce);
			});

			it('should have recipientId string equal to provided recipient id', () => {
				return expect(transferTransaction.asset).toHaveProperty(
					'recipientId',
					recipientId,
				);
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				return expect(transferTransaction).toHaveProperty(
					'senderPublicKey',
					publicKey,
				);
			});

			it('should have signatures hex string', () => {
				expect(transferTransaction.signatures).toBeArray();
				expect((transferTransaction as any).signatures[0]).toBe(
					'9625dee6f6cb1dd83608bbd430ef36e5f150465641b3eb59f08cca6882a2b659339da8982b010a3a63658268712c189b30fd5641eec166cbf91b1869b2e08900',
				);
			});

			it('without network identifier it should throw a descriptive error', () => {
				expect(() =>
					transfer({
						recipientId,
						amount,
						passphrase,
						data: testData,
						fee,
						nonce,
					} as any),
				).toThrow('Network identifier can not be empty');
			});
		});

		describe('with data', () => {
			beforeEach(() => {
				transferTransaction = transfer({
					recipientId,
					amount,
					networkIdentifier,
					passphrase,
					data: testData,
					fee,
					nonce,
				});
			});

			it('should handle invalid (non-utf8 string) data', () => {
				return expect(
					transfer.bind(null, {
						recipientId,
						amount,
						networkIdentifier,
						passphrase,
						data: Buffer.from('hello') as any,
						fee,
						nonce,
					}),
				).toThrow(
					'Invalid encoding in transaction data. Data must be utf-8 encoded string.',
				);
			});

			it('should have fee string equal to transfer fee', () => {
				return expect(transferTransaction).toHaveProperty('fee', fee);
			});

			describe('data asset', () => {
				it('should be a string equal to provided data', () => {
					return expect(transferTransaction.asset).toHaveProperty(
						'data',
						testData,
					);
				});
			});
		});
	});

	describe('with multiple passphrases', () => {
		it('should return two signatures for two mandatory public keys and two passphrases', () => {
			const { members } = secondSignatureReg.testCases.input;
			const { output: secondSignatureAccount } = secondSignatureReg.testCases;
			const accountOwnerPk = cryptography.getAddressAndPublicKeyFromPassphrase(
				members.mandatoryOne.passphrase,
			);

			transferTransaction = transfer({
				senderPublicKey: accountOwnerPk.publicKey,
				recipientId,
				amount,
				networkIdentifier,
				fee,
				nonce,
				passphrases: [
					members.mandatoryOne.passphrase,
					members.mandatoryTwo.passphrase,
				],
				keys: {
					mandatoryKeys: secondSignatureAccount.asset.mandatoryKeys,
					optionalKeys: [],
				},
			});

			// These signatures were calculated by signing the bytes of the transaction and are valid for the serialized bytes
			const validSignatureMemberOne =
				'ab09ad9764b372a4932214eccc1726c3673488c97b0a75210b503c9520af0926b63d4dd4c3d5fd998167177bac2a3b1a6f06606a7562aaf31a4a7a28df547e07';
			const validSignatureMemberTwo =
				'c83b6f1d0994680fc47750dd5199d5762d5039c36c6f12ed8ea5847c6f9c928d44556a10fe898f6ae4a6c4845457f1d09f9e898eb2b3af18a7a84d55942a4900';

			expect(transferTransaction.signatures?.length).toBe(2);
			expect((transferTransaction as any).signatures[0]).toBe(
				validSignatureMemberOne,
			);
			expect((transferTransaction as any).signatures[1]).toBe(
				validSignatureMemberTwo,
			);
		});

		it('should return one signature for two mandatory public keys and one passphrase', () => {
			const { members } = secondSignatureReg.testCases.input;
			const { output: secondSignatureAccount } = secondSignatureReg.testCases;
			const accountOwnerPk = cryptography.getAddressAndPublicKeyFromPassphrase(
				members.mandatoryOne.passphrase,
			);

			transferTransaction = transfer({
				senderPublicKey: accountOwnerPk.publicKey,
				recipientId,
				amount,
				networkIdentifier,
				fee,
				nonce,
				passphrases: [members.mandatoryOne.passphrase],
				keys: {
					mandatoryKeys: secondSignatureAccount.asset.mandatoryKeys,
					optionalKeys: [],
				},
			});

			// These signatures were calculated by signing the bytes of the transaction and are valid for the serialized bytes
			const validSignatureMemberOne =
				'ab09ad9764b372a4932214eccc1726c3673488c97b0a75210b503c9520af0926b63d4dd4c3d5fd998167177bac2a3b1a6f06606a7562aaf31a4a7a28df547e07';

			expect(transferTransaction.signatures?.length).toBe(2);
			expect((transferTransaction as any).signatures[0]).toBe(
				validSignatureMemberOne,
			);
			expect((transferTransaction as any).signatures[1]).toBe('');
		});

		it('should return one signature for two mandatory public keys and one passphrase in the right order', () => {
			const { members } = secondSignatureReg.testCases.input;
			const { output: secondSignatureAccount } = secondSignatureReg.testCases;
			const accountOwnerPk = cryptography.getAddressAndPublicKeyFromPassphrase(
				members.mandatoryOne.passphrase,
			);

			transferTransaction = transfer({
				senderPublicKey: accountOwnerPk.publicKey,
				recipientId,
				amount,
				networkIdentifier,
				fee,
				nonce,
				passphrases: [members.mandatoryTwo.passphrase],
				keys: {
					mandatoryKeys: secondSignatureAccount.asset.mandatoryKeys,
					optionalKeys: [],
				},
			});

			// These signatures were calculated by signing the bytes of the transaction and are valid for the serialized bytes
			const validSignatureMemberTwo =
				'c83b6f1d0994680fc47750dd5199d5762d5039c36c6f12ed8ea5847c6f9c928d44556a10fe898f6ae4a6c4845457f1d09f9e898eb2b3af18a7a84d55942a4900';
			expect(transferTransaction.signatures?.length).toBe(2);
			expect((transferTransaction as any).signatures[0]).toBe('');
			expect((transferTransaction as any).signatures[1]).toBe(
				validSignatureMemberTwo,
			);
		});
	});

	describe('unsigned transfer transaction', () => {
		describe('when the transfer transaction is created without a passphrase', () => {
			beforeEach(() => {
				transferTransaction = transfer({
					recipientId,
					amount,
					networkIdentifier,
					fee,
					nonce,
				});
			});

			it('should throw error when amount is 0', () => {
				return expect(
					transfer.bind(null, {
						amount: '0',
						networkIdentifier,
						fee,
						nonce,
					}),
				).toThrow('Amount must be a valid number in string format.');
			});

			it('should throw error when amount is greater than max transaction amount', () => {
				return expect(
					transfer.bind(null, {
						amount: '18446744073709551616',
						networkIdentifier,
						fee,
						nonce,
					}),
				).toThrow('Amount must be a valid number in string format.');
			});

			it('should throw error when recipientId & non-matching recipientPublicKey provided', () => {
				return expect(
					transfer.bind(null, {
						amount,
						networkIdentifier,
						recipientId,
						recipientPublicKey: recipientPublicKeyThatDoesNotMatchRecipientId,
						fee,
						nonce,
					}),
				).toThrow('recipientId does not match recipientPublicKey.');
			});

			it('should non throw error when recipientId & matching recipientPublicKey provided', () => {
				return expect(
					transfer.bind(null, {
						amount,
						networkIdentifier,
						recipientId,
						recipientPublicKey,
						fee,
						nonce,
					}),
				).not.toThrow();
			});

			it('should throw error when neither recipientId nor recipientPublicKey were provided', () => {
				return expect(
					transfer.bind(null, {
						amount,
						networkIdentifier,
						passphrase,
						data: Buffer.from('hello') as any,
						fee,
						nonce,
					}),
				).toThrow('Either recipientId or recipientPublicKey must be provided.');
			});

			it('should set recipientId when recipientId was not provided but recipientPublicKey was provided', () => {
				const tx = transfer({
					amount,
					networkIdentifier,
					passphrase,
					recipientPublicKey: publicKey,
					fee,
					nonce,
				});
				return expect(tx.asset).toHaveProperty(
					'recipientId',
					cryptography.getAddressFromPublicKey(publicKey),
				);
			});

			it('should handle too much data', () => {
				return expect(
					transfer.bind(null, {
						recipientId,
						amount,
						networkIdentifier,
						data: new Array(65).fill('0').join(''),
						fee,
						nonce,
					}),
				).toThrow('Transaction data field cannot exceed 64 bytes.');
			});

			it('should have the type', () => {
				return expect(transferTransaction).toHaveProperty(
					'type',
					transactionType,
				);
			});

			it('should have the amount', () => {
				return expect(transferTransaction.asset).toHaveProperty(
					'amount',
					amount,
				);
			});

			it('should have the recipient', () => {
				return expect(transferTransaction.asset).toHaveProperty(
					'recipientId',
					recipientId,
				);
			});

			it('should have the sender public key', () => {
				return expect(transferTransaction).toHaveProperty(
					'senderPublicKey',
					undefined,
				);
			});

			it('should have the asset', () => {
				return expect(transferTransaction).toHaveProperty('asset');
			});

			it('should not have the signatures', () => {
				return expect(transferTransaction).not.toHaveProperty('signatures');
			});

			it('should not have the id', () => {
				return expect(transferTransaction).not.toHaveProperty('id');
			});
		});
	});
});
