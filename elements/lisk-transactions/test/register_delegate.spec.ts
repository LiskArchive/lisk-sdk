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
				'a9e2956df2663761c1f727d849e3731494deb16d797916be9f1dd3183b911aa543c5fe3a5347dddd8f4bc3ff5136966c004d2c28cc58d8b4c446e90e1f5aff04',
			);
		});

		describe('delegate asset', () => {
			it('should be an object', () => {
				return expect(
					(registerDelegateTransaction.asset as any).username,
				).toBeString();
			});

			it('should have the provided username as a string', () => {
				const {
					username: assetUsername,
				} = registerDelegateTransaction.asset as DelegateAsset;
				return expect(assetUsername).toBe(username);
			});
		});
	});

	describe('with multiple passphrases', () => {
		it('should return two signatures for two mandatory public keys and two passphrases', () => {
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
				},
			});

			// These signatures were calculated by signing the bytes of the transaction and are valid for the serialized bytes
			const validSignatureMemberOne =
				'236d4359c91cec3e0d7c06a67613172f24d8eec2d3307d9affd16de29db17a3df1ab1a67a4a99ab6a6efafe3ebf93227b109c04bf6bab0fe41a9071261dc5e06';
			const validSignatureMemberTwo =
				'a1201808bd6ab12e45cbb416a363c156ddcc3901b26a6c33046de62af9a339b25f5ad99f42d306ec041e99c757b8a1fe5c069f4a69f145673edda208b57c8808';

			expect(registerDelegateTransaction.signatures?.length).toBe(2);
			expect((registerDelegateTransaction as any).signatures[0]).toBe(
				validSignatureMemberOne,
			);
			expect((registerDelegateTransaction as any).signatures[1]).toBe(
				validSignatureMemberTwo,
			);
		});

		it('should return one signature for two mandatory public keys and one passphrase', () => {
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
				},
			});

			// These signatures were calculated by signing the bytes of the transaction and are valid for the serialized bytes
			const validSignatureMemberOne =
				'236d4359c91cec3e0d7c06a67613172f24d8eec2d3307d9affd16de29db17a3df1ab1a67a4a99ab6a6efafe3ebf93227b109c04bf6bab0fe41a9071261dc5e06';

			expect(registerDelegateTransaction.signatures?.length).toBe(2);
			expect((registerDelegateTransaction as any).signatures[0]).toBe(
				validSignatureMemberOne,
			);
			expect((registerDelegateTransaction as any).signatures[1]).toBe('');
		});

		it('should return one signature for two mandatory public keys and one passphrase in the right order', () => {
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
				},
			});

			// These signatures were calculated by signing the bytes of the transaction and are valid for the serialized bytes
			const validSignatureMemberTwo =
				'a1201808bd6ab12e45cbb416a363c156ddcc3901b26a6c33046de62af9a339b25f5ad99f42d306ec041e99c757b8a1fe5c069f4a69f145673edda208b57c8808';
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
			});

			it('should throw error when username was not provided', () => {
				return expect(registerDelegate.bind(null, {} as any)).toThrow(
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
				).toThrow('Please provide a username. Expected string.');
			});

			it('should throw error when invalid username was provided', () => {
				return expect(
					registerDelegate.bind(null, {
						networkIdentifier,
						fee,
						nonce,
						username: '12345678901234567890a',
					}),
				).toThrow(
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
