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
import { MAX_TRANSACTION_AMOUNT } from '../src/constants';
import { TransferTransaction } from '../src/8_transfer_transaction';
import { Account } from '../src/transaction_types';
import { Status } from '../src/response';
import { TransactionError } from '../src/errors';
import { defaultAccount, StateStoreMock } from './utils/state_store_mock';
import * as fixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';
import * as secondSignatureReg from '../fixtures/transaction_multisignature_registration/multisignature_registration_2nd_sig_equivalent_transaction.json';
import { BaseTransaction } from '../src';

describe('Transfer transaction class', () => {
	const validTransferTransaction = fixture.testCases[0].output;
	const validTransferInput = fixture.testCases[0].input;
	const validTransferAccount = fixture.testCases[0].input.account;
	let validTransferTestTransaction: TransferTransaction;
	let sender: Account;
	let recipient: Account;
	let store: StateStoreMock;

	beforeEach(async () => {
		validTransferTestTransaction = new TransferTransaction(
			validTransferTransaction,
		);
		sender = {
			...defaultAccount,
			balance: BigInt('10000000000'),
			address: validTransferTestTransaction.senderId,
		};
		sender.nonce = BigInt(validTransferAccount.nonce);

		recipient = {
			...defaultAccount,
			balance: BigInt('10000000000'),
			address: validTransferTestTransaction.asset.recipientId,
		};
		recipient.nonce = BigInt(validTransferAccount.nonce);

		store = new StateStoreMock([sender, recipient]);

		jest.spyOn(store.account, 'cache');
		jest.spyOn(store.account, 'get');
		jest.spyOn(store.account, 'getOrDefault');
		jest.spyOn(store.account, 'set');
	});

	describe('#constructor', () => {
		it('should create instance of TransferTransaction', async () => {
			expect(validTransferTestTransaction).toBeInstanceOf(TransferTransaction);
		});

		it('should set transfer asset data', async () => {
			expect(validTransferTestTransaction.asset.data).toEqual(
				validTransferTestTransaction.asset.data,
			);
		});

		it('should set transfer asset amount', async () => {
			expect(validTransferTestTransaction.asset.amount.toString()).toEqual(
				validTransferTransaction.asset.amount,
			);
		});

		it('should set transfer asset recipientId', async () => {
			expect(validTransferTestTransaction.asset.recipientId).toEqual(
				validTransferTransaction.asset.recipientId,
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a successful transaction response', async () => {
			const {
				id,
				status,
				errors,
			} = validTransferTestTransaction.verifyAgainstOtherTransactions([]);
			expect(id).toEqual(validTransferTransaction.id);
			expect(Object.keys(errors)).toHaveLength(0);
			expect(status).toEqual(Status.OK);
		});
	});

	describe('#assetToJSON', () => {
		it('should return an object of type transfer asset', async () => {
			expect(
				(validTransferTestTransaction.assetToJSON() as any).data,
			).toBeString();
		});
	});

	describe('#prepare', () => {
		it('should call state store', async () => {
			await validTransferTestTransaction.prepare(store);
			expect(store.account.cache).toHaveBeenCalledWith([
				{ address: validTransferTestTransaction.senderId },
				{ address: validTransferTestTransaction.asset.recipientId },
			]);
		});
	});

	describe('#validateAsset', () => {
		it('should return no errors with a valid transfer transaction', async () => {
			const errors = (validTransferTestTransaction as any).validateAsset();
			expect(Object.keys(errors)).toHaveLength(0);
		});

		it('should return error with invalid recipientId', async () => {
			const transferTransactionWithInvalidRecipientId = new TransferTransaction(
				{
					...validTransferTransaction,
					asset: {
						...validTransferTransaction.asset,
						recipientId: '123456',
					},
				},
			);
			const errors = (transferTransactionWithInvalidRecipientId as any).validateAsset();

			expect(errors[0]).toBeInstanceOf(TransactionError);
			expect(errors[0].message).toContain(
				'\'.recipientId\' should match format "address"',
			);
		});

		it('should return error if recipientId exceed uint64 limit', async () => {
			const transferTransactionWithInvalidRecipientId = new TransferTransaction(
				{
					...validTransferTransaction,
					asset: {
						...validTransferTransaction.asset,
						recipientId: '19961131544040416558L',
					},
				},
			);
			const errors = (transferTransactionWithInvalidRecipientId as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0]).toBeInstanceOf(TransactionError);
		});

		it('should return error if recipientId contains leading zeros', async () => {
			const transferTransactionWithInvalidRecipientId = new TransferTransaction(
				{
					...validTransferTransaction,
					asset: {
						...validTransferTransaction.asset,
						recipientId: '000123L',
					},
				},
			);
			const errors = (transferTransactionWithInvalidRecipientId as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0]).toBeInstanceOf(TransactionError);
		});

		it('should return error with invalid amount', async () => {
			const transferTransactionWithInvalidAmount = new TransferTransaction({
				...validTransferTransaction,
				asset: {
					...validTransferTransaction.asset,
					amount: '92233720368547758087823474829847337',
				},
			});
			const errors = (transferTransactionWithInvalidAmount as any).validateAsset();

			expect(errors[0]).toBeInstanceOf(TransactionError);
			expect(errors[0].message).toEqual(
				'Amount must be a valid number in string format.',
			);
			expect(errors[0].dataPath).toEqual('.asset.amount');
		});

		it('should return error with invalid asset', async () => {
			const transferTransactionWithInvalidAsset = new TransferTransaction({
				...validTransferTransaction,
				asset: {
					...validTransferTransaction.asset,
					data:
						'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
				},
			});
			const errors = (transferTransactionWithInvalidAsset as any).validateAsset();

			expect(errors[0]).toBeInstanceOf(TransactionError);
		});

		it('should return error if asset data containing null string', async () => {
			const transferTransactionWithValiddAsset = new TransferTransaction({
				...validTransferTransaction,
				asset: {
					...validTransferTransaction.asset,
					data: '\u0000hey:)',
				},
			});
			const errors = (transferTransactionWithValiddAsset as any).validateAsset();

			expect(errors).toHaveLength(1);
			expect(errors[0]).toBeInstanceOf(TransactionError);
		});

		it('should return error with asset data containing overflowed string', async () => {
			const transferTransactionWithInvalidAsset = new TransferTransaction({
				...validTransferTransaction,
				asset: {
					data:
						'o2ljg313lzzopdcilxcuy840qzdnmj21hfehd8u63k9jkifpsgxptegi56t8xos现',
				},
			});
			const errors = (transferTransactionWithInvalidAsset as any).validateAsset();

			expect(errors[0]).toBeInstanceOf(TransactionError);
		});
	});

	describe('#applyAsset', () => {
		it('should return no errors', async () => {
			const errors = (validTransferTestTransaction as any).applyAsset(store);

			expect(Object.keys(errors)).toHaveLength(0);
		});

		it('should call state store', async () => {
			await (validTransferTestTransaction as any).applyAsset(store);
			expect(store.account.get).toHaveBeenCalledWith(
				validTransferTestTransaction.senderId,
			);
			expect(store.account.set).toHaveBeenCalledWith(
				sender.address,
				expect.objectContaining({
					address: sender.address,
					publicKey: sender.publicKey,
				}),
			);
			expect(store.account.getOrDefault).toHaveBeenCalledWith(
				validTransferTestTransaction.asset.recipientId,
			);
			expect(store.account.set).toHaveBeenCalledWith(
				recipient.address,
				expect.objectContaining({
					address: recipient.address,
					publicKey: recipient.publicKey,
				}),
			);
		});

		it('should return error when recipient balance is over maximum amount', async () => {
			store.account.set(recipient.address, {
				...recipient,
				balance: BigInt(MAX_TRANSACTION_AMOUNT),
			});
			const errors = await (validTransferTestTransaction as any).applyAsset(
				store,
			);
			expect(errors[0].message).toEqual('Invalid amount');
		});

		it('should return error when recipient balance is below minimum remaining balance', async () => {
			store.account.set(recipient.address, {
				...recipient,
				balance:
					-validTransferTestTransaction.asset.amount +
					BaseTransaction.MIN_REMAINING_BALANCE -
					BigInt(1),
			});
			const errors = await (validTransferTestTransaction as any).applyAsset(
				store,
			);
			expect(errors[0].message).toContain(
				'Account does not have enough minimum remaining LSK',
			);
		});
	});

	describe('#undoAsset', () => {
		it('should call state store', async () => {
			await (validTransferTestTransaction as any).undoAsset(store);
			expect(store.account.get).toHaveBeenCalledWith(
				validTransferTestTransaction.senderId,
			);

			expect(store.account.set).toHaveBeenCalledWith(
				sender.address,
				expect.objectContaining({
					address: sender.address,
					publicKey: sender.publicKey,
				}),
			);
			expect(store.account.getOrDefault).toHaveBeenCalledWith(
				validTransferTestTransaction.asset.recipientId,
			);
			expect(store.account.set).toHaveBeenCalledWith(
				recipient.address,
				expect.objectContaining({
					address: recipient.address,
					publicKey: recipient.publicKey,
				}),
			);
		});

		it('should return error when sender balance is over maximum amount', async () => {
			store.account.set(sender.address, {
				...sender,
				balance: BigInt(MAX_TRANSACTION_AMOUNT),
			});
			const errors = await (validTransferTestTransaction as any).undoAsset(
				store,
			);
			expect(errors[0].message).toEqual('Invalid amount');
		});
	});

	describe('#signAll', () => {
		const { transaction, account, networkIdentifier } = validTransferInput;
		let validTransferInstance: BaseTransaction;
		beforeEach(async () => {
			validTransferInstance = new TransferTransaction(transaction);
		});

		it('should have one signature for single key pair account', async () => {
			validTransferInstance.sign(
				networkIdentifier,
				account.passphrase,
				undefined,
				undefined,
			);
			expect(validTransferInstance.signatures[0]).toBe(
				validTransferTransaction.signatures[0],
			);
		});

		it('should have two signatures for a multisignature account used as 2nd passphrase account', async () => {
			const { members } = secondSignatureReg.testCases.input;
			const { output: secondSignatureAccount } = secondSignatureReg.testCases;

			validTransferInstance.sign(
				networkIdentifier,
				undefined,
				[members.mandatoryOne.passphrase, members.mandatoryTwo.passphrase],
				{
					...secondSignatureAccount.asset,
				},
			);

			expect(validTransferInstance.signatures.length).toBe(2);
			expect(validTransferInstance.signatures).toStrictEqual([
				'80d364c0fa5f3a53587986d96316404313b1831408c35ead1eac02d264919708034f8b61198cad29c966d0336c5526acfc37215b7ee17152aebd85f6963dec0c',
				'be8498bf26315480bb9d242b784b3d3a7fcd67fd74aede35e359a478a5932ea40287f85bc3e6b8dbaac2642162b11ae4341bd510048bf58f742d3db1d4f0a50d',
			]);
		});
	});
});
