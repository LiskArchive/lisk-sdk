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
import { MockStateStore as store } from '../helpers';
import { SecondSignatureTransaction } from '../../src/transactions';
import {
	validRegisterSecondSignatureTransaction,
	validTransaction,
} from '../../fixtures';
import { Status, TransactionJSON } from '../../src/transaction_types';
import { hexToBuffer } from '@liskhq/lisk-cryptography';

describe('Second signature registration transaction class', () => {
	let validTestTransaction: SecondSignatureTransaction;
	const sender = {
		address: '10020978176543317477L',
		balance: '32981247530771',
		publicKey:
			'8aceda0f39b35d778f55593227f97152f0b5a78b80b5c4ae88979909095d6204',
	};

	beforeEach(async () => {
		validTestTransaction = new SecondSignatureTransaction(
			validRegisterSecondSignatureTransaction,
		);
		store.account.get = () => {
			return sender;
		};
	});

	describe('#constructor', () => {
		it('should create instance of SecondSignatureTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(SecondSignatureTransaction);
		});

		it('should set the second signature asset', async () => {
			expect(validTestTransaction.asset.signature)
				.to.be.an('object')
				.and.to.have.property('publicKey');
		});

		it('should throw TransactionMultiError when asset signature publicKey is not string', async () => {
			const invalidSecondSignatureTransaction = {
				...validRegisterSecondSignatureTransaction,
				asset: {
					signature: { publicKey: 123 },
				},
			};
			expect(
				() => new SecondSignatureTransaction(invalidSecondSignatureTransaction),
			).to.throw('Invalid field types');
		});
	});

	describe('#getAssetBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(
				hexToBuffer(
					validRegisterSecondSignatureTransaction.asset.signature.publicKey,
				),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a successful transaction response', async () => {
			const {
				id,
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				{ ...validRegisterSecondSignatureTransaction, type: 0 },
			] as ReadonlyArray<TransactionJSON>);
			expect(id).to.be.eql(validTestTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.equal(Status.OK);
		});

		it('should return status true with non related transactions', async () => {
			const {
				id,
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(id).to.be.eql(validTestTransaction.id);
			expect(errors).to.be.empty;
			expect(status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with error when other second signature registration transaction from the same account exists', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validRegisterSecondSignatureTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors).to.not.be.empty;
			expect(status).to.equal(Status.FAIL);
		});
	});

	describe('#validateAsset', () => {
		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).validateAsset();

			expect(errors).to.be.empty;
		});

		it('should return error when amount is non-zero', async () => {
			const invalidTransaction = {
				...validRegisterSecondSignatureTransaction,
				amount: '100',
			};
			const transaction = new SecondSignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).not.to.be.empty;
		});

		it('should return error when asset includes invalid publicKey', async () => {
			const invalidTransaction = {
				...validRegisterSecondSignatureTransaction,
				asset: {
					signature: {
						publicKey: '1234',
					},
				},
			};
			const transaction = new SecondSignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).not.to.be.empty;
		});
	});

	describe('#applyAsset', () => {
		it('should return a successful transaction response', async () => {
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).to.be.empty;
		});

		it('should return error when secondPublicKey exists on account', async () => {
			store.account.get = () => {
				return {
					...sender,
					secondPublicKey: '123',
				};
			};
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors[0].message).to.contains(
				'Register second signature only allowed once per account.',
			);
		});
	});

	describe('#undoAsset', () => {
		it('should return a successful transaction response', async () => {
			const errors = (validTestTransaction as any).undoAsset(store);
			expect(errors).to.be.empty;
		});
	});
});
