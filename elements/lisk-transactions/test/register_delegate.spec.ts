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
import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { registerDelegate } from '../src/register_delegate';
import { DelegateAsset } from '../src/10_delegate_transaction';
import { TransactionJSON } from '../src/transaction_types';
import * as secondSignatureReg from '../fixtures/transaction_multisignature_registration/multisignature_registration_2nd_sig_equivalent_transaction.json';

describe('#registerDelegate transaction', () => {
	const fixedPoint = 10 ** 8;
	const passphrase = 'secret';
	const transactionType = 10;
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const username = 'test_delegate_1@\\';
	const fee = (25 * fixedPoint).toString();
	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';
	const nonce = '0';

	let registerDelegateTransaction: Partial<TransactionJSON>;

	describe('with single passphrase', () => {
		beforeEach(() => {
			registerDelegateTransaction = registerDelegate({
				fee,
				nonce,
				passphrase,
				username,
				networkIdentifier,
			});
			return Promise.resolve();
		});

		it('should create a register delegate transaction', () => {
			return expect(registerDelegateTransaction).toBeTruthy();
		});

		it('should be an object', () => {
			return expect(registerDelegateTransaction).toBeObject();
		});

		it('should have an id string', () => {
			return expect(registerDelegateTransaction.id).toBeString();
		});

		it('should have type number equal to 2', () => {
			return expect(registerDelegateTransaction).toHaveProperty(
				'type',
				transactionType,
			);
		});

		it('should have fee string equal to 25 LSK', () => {
			return expect(registerDelegateTransaction).toHaveProperty('fee', fee);
		});

		it('should have senderPublicKey hex string equal to sender public key', () => {
			return expect(registerDelegateTransaction).toHaveProperty(
				'senderPublicKey',
				publicKey,
			);
		});

		it('should have signatures hex string', () => {
			expect(registerDelegateTransaction.signatures).toBeArray();
			expect(registerDelegateTransaction.signatures?.length).toBe(1);
			expect((registerDelegateTransaction as any).signatures[0]).toBe(
				'ea925e4edc8a54482d99905965d885ef4341f8f15cc0cd8c9b57d523edd5b5ed18a20065cd9a06630d73af16ebb328b8e50f5be878eb669f810ffaa09ac9de02',
			);
		});

		describe('delegate asset', () => {
			it('should be an object', () => {
				return expect(
					(registerDelegateTransaction.asset as any).username,
				).toBeString();
			});

			it('should have the provided username as a string', () => {
				const { username } = registerDelegateTransaction.asset as DelegateAsset;
				return expect(username).toBe(username);
			});
		});
	});

	describe('with multiple passphrases', () => {
		it('should return two signatures for two mandatory public keys and two passphrases', async () => {
			const { members } = secondSignatureReg.testCases.input;
			const { output: secondSignatureAccount } = secondSignatureReg.testCases;
			const accountOwnerPk = getAddressAndPublicKeyFromPassphrase(
				members.mandatoryOne.passphrase,
			);

			registerDelegateTransaction = registerDelegate({
				senderPublicKey: accountOwnerPk.publicKey,
				networkIdentifier,
				fee,
				nonce,
				username,
				passphrases: [
					members.mandatoryOne.passphrase,
					members.mandatoryTwo.passphrase,
				],
				keys: {
					mandatoryKeys: secondSignatureAccount.asset.mandatoryKeys,
					optionalKeys: [],
					numberOfSignatures: secondSignatureAccount.asset.numberOfSignatures,
				},
			});

			// These signatures were calculated by signing the bytes of the transaction and are valid for the serialized bytes
			const validSignatureMemberOne =
				'e77e30950708f9135256f8f27bef7100d1e96cafd7e6e96f77d990a973e6797dd3ff6cc5d98d3037783e7eefd7f396a911c593785824cf16e16a8af486e3bb08';
			const validSignatureMemberTwo =
				'a67d45e820734e8e82c84b13cc4871d7e8213993a592fff6ed4b35b8733e751eb43c8b5c25e3d3ef7d10ddc9fcea435d05dde0ec888695ea6741a5cd91f9dd06';

			expect(registerDelegateTransaction.signatures?.length).toBe(2);
			expect((registerDelegateTransaction as any).signatures[0]).toBe(
				validSignatureMemberOne,
			);
			expect((registerDelegateTransaction as any).signatures[1]).toBe(
				validSignatureMemberTwo,
			);
		});

		it('should return one signature for two mandatory public keys and one passphrase', async () => {
			const { members } = secondSignatureReg.testCases.input;
			const { output: secondSignatureAccount } = secondSignatureReg.testCases;
			const accountOwnerPk = getAddressAndPublicKeyFromPassphrase(
				members.mandatoryOne.passphrase,
			);

			registerDelegateTransaction = registerDelegate({
				senderPublicKey: accountOwnerPk.publicKey,
				username,
				networkIdentifier,
				fee,
				nonce,
				passphrases: [members.mandatoryOne.passphrase],
				keys: {
					mandatoryKeys: secondSignatureAccount.asset.mandatoryKeys,
					optionalKeys: [],
					numberOfSignatures: secondSignatureAccount.asset.numberOfSignatures,
				},
			});

			// These signatures were calculated by signing the bytes of the transaction and are valid for the serialized bytes
			const validSignatureMemberOne =
				'e77e30950708f9135256f8f27bef7100d1e96cafd7e6e96f77d990a973e6797dd3ff6cc5d98d3037783e7eefd7f396a911c593785824cf16e16a8af486e3bb08';

			expect(registerDelegateTransaction.signatures?.length).toBe(2);
			expect((registerDelegateTransaction as any).signatures[0]).toBe(
				validSignatureMemberOne,
			);
			expect((registerDelegateTransaction as any).signatures[1]).toBe('');
		});

		it('should return one signature for two mandatory public keys and one passphrase in the right order', async () => {
			const { members } = secondSignatureReg.testCases.input;
			const { output: secondSignatureAccount } = secondSignatureReg.testCases;
			const accountOwnerPk = getAddressAndPublicKeyFromPassphrase(
				members.mandatoryOne.passphrase,
			);

			registerDelegateTransaction = registerDelegate({
				senderPublicKey: accountOwnerPk.publicKey,
				username,
				networkIdentifier,
				fee,
				nonce,
				passphrases: [members.mandatoryTwo.passphrase],
				keys: {
					mandatoryKeys: secondSignatureAccount.asset.mandatoryKeys,
					optionalKeys: [],
					numberOfSignatures: secondSignatureAccount.asset.numberOfSignatures,
				},
			});

			// These signatures were calculated by signing the bytes of the transaction and are valid for the serialized bytes
			const validSignatureMemberTwo =
				'a67d45e820734e8e82c84b13cc4871d7e8213993a592fff6ed4b35b8733e751eb43c8b5c25e3d3ef7d10ddc9fcea435d05dde0ec888695ea6741a5cd91f9dd06';
			expect(registerDelegateTransaction.signatures?.length).toBe(2);
			expect((registerDelegateTransaction as any).signatures[0]).toBe('');
			expect((registerDelegateTransaction as any).signatures[1]).toBe(
				validSignatureMemberTwo,
			);
		});
	});

	describe('unsigned register delegate transaction', () => {
		describe('when the register delegate transaction is created without a passphrase', () => {
			beforeEach(() => {
				registerDelegateTransaction = registerDelegate({
					networkIdentifier,
					fee,
					nonce,
					username,
				});
				return Promise.resolve();
			});

			it('should throw error when username was not provided', () => {
				return expect(registerDelegate.bind(null, {} as any)).toThrowError(
					'Please provide a username. Expected string.',
				);
			});

			it('should throw error when username is empty string', () => {
				return expect(
					registerDelegate.bind(null, {
						networkIdentifier,
						fee,
						nonce,
						username: '',
					}),
				).toThrowError('Please provide a username. Expected string.');
			});

			it('should throw error when invalid username was provided', () => {
				return expect(
					registerDelegate.bind(null, {
						networkIdentifier,
						fee,
						nonce,
						username: '12345678901234567890a',
					}),
				).toThrowError(
					'Username length does not match requirements. Expected to be no more than 20 characters.',
				);
			});

			it('should have the type', () => {
				return expect(registerDelegateTransaction).toHaveProperty(
					'type',
					transactionType,
				);
			});

			it('should have the fee', () => {
				return expect(registerDelegateTransaction).toHaveProperty('fee', fee);
			});

			it('should have the sender public key', () => {
				return expect(registerDelegateTransaction).toHaveProperty(
					'senderPublicKey',
					undefined,
				);
			});

			it('should have the asset with the delegate', () => {
				return expect(registerDelegateTransaction.asset).toHaveProperty(
					'username',
				);
			});

			it('should not have the signatures', () => {
				return expect(registerDelegateTransaction).not.toHaveProperty(
					'signatures',
				);
			});

			it('should not have the id', () => {
				return expect(registerDelegateTransaction).not.toHaveProperty('id');
			});
		});
	});
});
