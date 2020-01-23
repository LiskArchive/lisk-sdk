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
import { MAX_TRANSACTION_AMOUNT, TRANSFER_FEE } from '../src/constants';
import { TransferTransaction } from '../src/8_transfer_transaction';
import { Account } from '../src/transaction_types';
import { Status } from '../src/response';
import { TransactionError } from '../src/errors';
import { MockStateStore as store } from './helpers';
import * as fixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';

describe('Transfer transaction class', () => {
	const validTransferTransaction = fixture.testCases[0].output;
	const validTransferAccount = fixture.testCases[0].input.account;
	let validTransferTestTransaction: TransferTransaction;
	let sender: Account;
	let recipient: Account;
	let storeAccountCacheStub: jest.SpyInstance;
	let storeAccountGetStub: jest.SpyInstance;
	let storeAccountGetOrDefaultStub: jest.SpyInstance;
	let storeAccountSetStub: jest.SpyInstance;

	beforeEach(async () => {
		validTransferTestTransaction = new TransferTransaction(
			validTransferTransaction,
		);
		sender = { ...validTransferAccount, balance: '10000000000' };
		recipient = { ...validTransferAccount, balance: '10000000000' };
		storeAccountCacheStub = jest.spyOn(store.account, 'cache');
		storeAccountGetStub = jest
			.spyOn(store.account, 'get')
			.mockReturnValue(sender);
		storeAccountGetOrDefaultStub = jest
			.spyOn(store.account, 'getOrDefault')
			.mockReturnValue(recipient);
		storeAccountSetStub = jest.spyOn(store.account, 'set');
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

		it('should set fee to transfer transaction fee amount', async () => {
			expect(validTransferTestTransaction.fee.toString()).toEqual(
				TRANSFER_FEE.toString(),
			);
		});
	});

	describe('#getBasicBytes', () => {
		const expectedBytes =
			'08033ccd24efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d00000000499602d2fbc2d06c336d04be72616e646f6d2064617461';
		it('should return a buffer', async () => {
			const basicBytes = (validTransferTestTransaction as any).getBasicBytes();

			expect(basicBytes).toEqual(Buffer.from(expectedBytes, 'hex'));
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
			expect(storeAccountCacheStub).toHaveBeenCalledWith([
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
					amount: '9223372036854775808',
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
			(validTransferTestTransaction as any).applyAsset(store);
			expect(storeAccountGetStub).toHaveBeenCalledWith(
				validTransferTestTransaction.senderId,
			);
			expect(storeAccountSetStub).toHaveBeenCalledWith(sender.address, {
				...sender,
				balance: (
					BigInt(sender.balance) -
					BigInt(validTransferTestTransaction.asset.amount)
				).toString(),
			});
			expect(storeAccountGetOrDefaultStub).toHaveBeenCalledWith(
				validTransferTestTransaction.asset.recipientId,
			);
			expect(storeAccountSetStub).toHaveBeenCalledWith(recipient.address, {
				...recipient,
				balance: (
					BigInt(recipient.balance) -
					BigInt(validTransferTestTransaction.asset.amount)
				).toString(),
			});
		});

		it('should return error when sender balance is insufficient', async () => {
			storeAccountGetStub.mockReturnValue({
				...sender,
				balance: BigInt(10000000),
			});
			const errors = (validTransferTestTransaction as any).applyAsset(store);
			expect(errors).toHaveLength(1);
			expect(errors[0].message).toBe(
				`Account does not have enough LSK: ${sender.address}, balance: 0.2`,
			);
		});

		it('should return error when recipient balance is over maximum amount', async () => {
			storeAccountGetOrDefaultStub.mockReturnValue({
				...sender,
				balance: BigInt(MAX_TRANSACTION_AMOUNT),
			});
			const errors = (validTransferTestTransaction as any).applyAsset(store);
			expect(errors[0].message).toEqual('Invalid amount');
		});
	});

	describe('#undoAsset', () => {
		it('should call state store', async () => {
			(validTransferTestTransaction as any).undoAsset(store);
			expect(storeAccountGetStub).toHaveBeenCalledWith(
				validTransferTestTransaction.senderId,
			);
			expect(storeAccountSetStub).toHaveBeenCalledWith(sender.address, {
				...sender,
				balance: (
					BigInt(sender.balance) +
					BigInt(validTransferTestTransaction.asset.amount)
				).toString(),
			});
			expect(storeAccountGetOrDefaultStub).toHaveBeenCalledWith(
				validTransferTestTransaction.asset.recipientId,
			);
			expect(storeAccountSetStub).toHaveBeenCalledWith(recipient.address, {
				...recipient,
				balance: (
					BigInt(recipient.balance) -
					BigInt(validTransferTestTransaction.asset.amount)
				).toString(),
			});
		});

		it('should return error when recipient balance is insufficient', async () => {
			storeAccountGetOrDefaultStub.mockReturnValue({
				...recipient,
				balance: BigInt('0'),
			});
			const errors = (validTransferTestTransaction as any).undoAsset(store);
			expect(errors[0].message).toBe(
				`Account does not have enough LSK: ${recipient.address}, balance: 0`,
			);
		});

		it('should return error when sender balance is over maximum amount', async () => {
			storeAccountGetStub.mockReturnValue({
				...recipient,
				balance: BigInt(MAX_TRANSACTION_AMOUNT),
			});
			const errors = (validTransferTestTransaction as any).undoAsset(store);
			expect(errors[0].message).toEqual('Invalid amount');
		});
	});
});
