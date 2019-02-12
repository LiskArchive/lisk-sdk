/*
 * Copyright © 2018 Lisk Foundation
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
import { expect } from 'chai';
import { MockStateStore as store } from './helpers';
import { DelegateTransaction } from '../src/2_delegate_transaction';
import {
	validDelegateAccount,
	validDelegateTransaction,
	validTransaction,
} from '../fixtures';
import { Account, TransactionJSON } from '../src/transaction_types';

describe('Delegate registration transaction class', () => {
	let validTestTransaction: DelegateTransaction;
	let sender: Account;

	beforeEach(async () => {
		validTestTransaction = new DelegateTransaction(validDelegateTransaction);
		sender = validDelegateAccount;
	});

	describe('#constructor', () => {
		it('should create instance of  DelegateTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(DelegateTransaction);
		});

		it('should set the delegate asset', async () => {
			expect(validTestTransaction.asset.delegate).to.be.an('object');
			expect(validTestTransaction.asset.delegate.username).to.eql('genesis_10');
		});

		it('should throw TransactionMultiError when asset is not valid string', async () => {
			const invalidDelegateTransactionData = {
				...validDelegateTransaction,
				asset: {
					delegate: {
						username: 123,
					},
				},
			};
			expect(
				() => new DelegateTransaction(invalidDelegateTransactionData),
			).to.throw('Invalid field types');
		});
	});

	describe('#assetToBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).assetToBytes();
			expect(assetBytes).to.eql(
				Buffer.from(validDelegateTransaction.asset.delegate.username, 'utf8'),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return no errors with non conflicting transactions', async () => {
			const { errors } = validTestTransaction.verifyAgainstOtherTransactions([
				validTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors).to.be.empty;
		});

		it('should return error when other transaction from same account has the same type', async () => {
			const conflictTransaction = {
				...validTransaction,
				senderPublicKey: validDelegateTransaction.senderPublicKey,
				type: 2,
			};
			const { errors } = validTestTransaction.verifyAgainstOtherTransactions([
				conflictTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors).to.not.be.empty;
		});
	});

	describe('#validateAsset', () => {
		it('should no errors', async () => {
			const errors = (validTestTransaction as any).validateAsset();
			expect(errors).to.be.empty;
		});

		it('should return error when asset includes invalid characters', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				asset: {
					delegate: {
						username: '%invalid%username*',
					},
				},
			};
			const transaction = new DelegateTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});

		it('should return error when asset includes uppercase', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				asset: {
					delegate: {
						username: 'InValIdUsErNAmE',
					},
				},
			};
			const transaction = new DelegateTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});

		it('should error when asset is potential address', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				asset: {
					delegate: {
						username: '1L',
					},
				},
			};
			const transaction = new DelegateTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});

		it('should return error when recipientId is not empty', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				recipientId: '1L',
				id: '17277443568874824891',
			};
			const transaction = new DelegateTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();

			expect(errors).not.to.be.empty;
		});

		it('should return error when recipientPublicKey is not empty', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				recipientPublicKey: '123',
			};
			const transaction = new DelegateTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.recipientPublicKey');
		});
	});

	describe('#applyAsset', () => {
		it('should returnerror when store includes account', async () => {
			store.account.get = () => {
				return {
					...sender,
					username: 'genesis_10',
				};
			};
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.asset.delegate.username');
		});

		it('should return an error when account is already delegate', async () => {
			const errors = (validTestTransaction as any).applyAsset(store);

			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.asset.delegate.username');
		});
	});

	describe('#undoAsset', () => {
		it('should return no errors', async () => {
			store.account.get = () => {
				return {
					...sender,
					username: 'genesis_10',
				};
			};
			const errors = (validTestTransaction as any).undoAsset(store);
			expect(errors).to.be.empty;
		});
	});
});
