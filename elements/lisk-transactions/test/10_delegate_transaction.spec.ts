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
import { MockStateStore as store } from './helpers';
import { DelegateTransaction } from '../src/10_delegate_transaction';
import { validDelegateAccount } from '../fixtures';
import * as protocolSpecDelegateFixture from '../fixtures/transaction_network_id_and_change_order/delegate_transaction_validate.json';
import * as protocolSpecTransferFixture from '../fixtures/transaction_network_id_and_change_order/transfer_transaction_validate.json';
import { Account, TransactionJSON } from '../src/transaction_types';

describe('Delegate registration transaction class', () => {
	const {
		networkIdentifier,
		transaction: validDelegateTransaction,
	} = protocolSpecDelegateFixture.testCases[0].input;
	const {
		transaction: validTransaction,
	} = protocolSpecTransferFixture.testCases[0].input;

	let validTestTransaction: DelegateTransaction;
	let sender: Partial<Account>;
	let storeAccountCacheStub: jest.SpyInstance;
	let storeAccountGetStub: jest.SpyInstance;
	let storeAccountSetStub: jest.SpyInstance;
	let storeAccountFindStub: jest.SpyInstance;
	const validDelegateAccountObj = {
		...validDelegateAccount,
		balance: BigInt(validDelegateAccount.balance),
	};

	beforeEach(async () => {
		validTestTransaction = new DelegateTransaction({
			...validDelegateTransaction,
			networkIdentifier,
		});
		validTestTransaction.sign(
			protocolSpecDelegateFixture.testCases[0].input.account.passphrase,
		);

		sender = validDelegateAccountObj;
		storeAccountCacheStub = jest.spyOn(store.account, 'cache');
		storeAccountGetStub = jest
			.spyOn(store.account, 'get')
			.mockReturnValue(sender);
		storeAccountSetStub = jest.spyOn(store.account, 'set');
		storeAccountFindStub = jest.spyOn(store.account, 'find');
	});

	describe('#constructor', () => {
		it('should create instance of  DelegateTransaction', async () => {
			expect(validTestTransaction).toBeInstanceOf(DelegateTransaction);
		});

		it('should set the delegate asset', async () => {
			expect(validTestTransaction.asset.username).toEqual(
				validDelegateTransaction.asset.username,
			);
		});

		it('should not throw when asset is not valid string', async () => {
			const invalidDelegateTransactionData = {
				...validDelegateTransaction,
				asset: {
					username: 123,
				},
			};
			expect(
				() => new DelegateTransaction(invalidDelegateTransactionData),
			).not.toThrowError();
		});

		it('should create instance of  DelegateTransaction when rawTransaction is empty', async () => {
			const validEmptyTestTransaction = new DelegateTransaction(null);
			expect(validEmptyTestTransaction).toBeInstanceOf(DelegateTransaction);
		});
	});

	describe('#assetToBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).assetToBytes();
			expect(assetBytes).toEqual(
				Buffer.from(validDelegateTransaction.asset.username, 'utf8'),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return no errors with non conflicting transactions', async () => {
			const { errors } = validTestTransaction.verifyAgainstOtherTransactions([
				validTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors).toHaveLength(0);
		});

		it('should return error when other transaction from same account has the same type', async () => {
			const conflictTransaction = {
				...validDelegateTransaction,
				senderPublicKey:
					protocolSpecDelegateFixture.testCases[0].input.account.publicKey,
				type: 10,
			};
			const { errors } = validTestTransaction.verifyAgainstOtherTransactions([
				conflictTransaction,
			] as ReadonlyArray<TransactionJSON>);

			expect(errors).not.toHaveLength(0);
		});
	});

	describe('#assetToJSON', () => {
		it('should return an object of type transfer asset', async () => {
			expect(validTestTransaction.assetToJSON()).toHaveProperty('username');
		});
	});

	describe('#prepare', () => {
		it('should call state store', async () => {
			await validTestTransaction.prepare(store);
			expect(storeAccountCacheStub).toHaveBeenCalledWith([
				{ address: validTestTransaction.senderId },
				{ username: validTestTransaction.asset.username },
			]);
		});
	});

	describe('#validateAsset', () => {
		it('should no errors', async () => {
			const errors = (validTestTransaction as any).validateAsset();
			expect(errors).toHaveLength(0);
		});

		it('should return error when asset includes invalid characters', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				asset: {
					username: '%invalid%username*',
				},
			};
			const transaction = new DelegateTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(1);
		});

		it('should return error when asset includes uppercase', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				asset: {
					username: 'InValIdUsErNAmE',
				},
			};
			const transaction = new DelegateTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(1);
		});

		it('should error when asset is potential address', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				asset: {
					username: '1L',
				},
			};
			const transaction = new DelegateTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(1);
		});
	});

	describe('#applyAsset', () => {
		it('should call state store', async () => {
			await (validTestTransaction as any).applyAsset(store);
			expect(storeAccountGetStub).toHaveBeenCalledWith(
				validTestTransaction.senderId,
			);
			expect(storeAccountFindStub).toHaveBeenCalledTimes(1);
			expect(storeAccountSetStub).toHaveBeenCalledWith(sender.address, {
				...sender,
				isDelegate: 1,
				voteWeight: BigInt(0),
				username: validTestTransaction.asset.username,
			});
		});

		it('should return no errors', async () => {
			const { isDelegate, username, ...strippedSender } = sender;
			storeAccountGetStub.mockReturnValue(strippedSender);
			storeAccountFindStub.mockReturnValue(false);
			const errors = await (validTestTransaction as any).applyAsset(store);
			expect(errors).toHaveLength(0);
		});

		it('should return error when username is taken', async () => {
			storeAccountFindStub.mockReturnValue(true);
			const errors = await (validTestTransaction as any).applyAsset(store);
			expect(errors).toHaveLength(2);
			expect(errors[0].dataPath).toBe('.asset.username');
		});

		it('should return an error when account is already delegate', async () => {
			const errors = await (validTestTransaction as any).applyAsset(store);

			expect(errors).toHaveLength(2);
			expect(errors[0].dataPath).toBe('.asset.username');
		});
	});

	describe('#undoAsset', () => {
		it('should call state store', async () => {
			await (validTestTransaction as any).undoAsset(store);
			expect(storeAccountGetStub).toHaveBeenCalledWith(
				validTestTransaction.senderId,
			);
			expect(storeAccountSetStub).toHaveBeenCalledWith(sender.address, {
				...sender,
				isDelegate: 0,
				voteWeight: BigInt(0),
				username: null,
			});
		});

		it('should return no errors', async () => {
			storeAccountGetStub.mockReturnValue(sender);
			const errors = await (validTestTransaction as any).undoAsset(store);
			expect(errors).toHaveLength(0);
		});
	});
});
