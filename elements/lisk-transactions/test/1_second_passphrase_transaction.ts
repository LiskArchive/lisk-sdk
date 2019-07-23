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
import { expect } from 'chai';
import { MockStateStore as store } from './helpers';
import { SecondSignatureTransaction } from '../src/1_second_signature_transaction';
import {
	validRegisterSecondSignatureTransaction,
	validTransaction,
} from '../fixtures';
import { TransactionJSON } from '../src/transaction_types';
import { Status } from '../src/response';
import { hexToBuffer } from '@liskhq/lisk-cryptography';

describe('Second signature registration transaction class', () => {
	let validTestTransaction: SecondSignatureTransaction;
	let storeAccountCacheStub: sinon.SinonStub;
	let storeAccountGetStub: sinon.SinonStub;
	let storeAccountSetStub: sinon.SinonStub;

	const sender = {
		address: '10020978176543317477L',
		balance: '32981247530771',
		publicKey:
			'8aceda0f39b35d778f55593227f97152f0b5a78b80b5c4ae88979909095d6204',
		secondPublicKey: null,
		secondSignature: 0,
	};

	beforeEach(async () => {
		validTestTransaction = new SecondSignatureTransaction(
			validRegisterSecondSignatureTransaction,
		);
		storeAccountCacheStub = sandbox.stub(store.account, 'cache');
		storeAccountGetStub = sandbox.stub(store.account, 'get').returns(sender);
		storeAccountSetStub = sandbox.stub(store.account, 'set');
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

		it('should not throw when asset signature publicKey is not string', async () => {
			const invalidSecondSignatureTransaction = {
				...validRegisterSecondSignatureTransaction,
				asset: {
					signature: { publicKey: 123 },
				},
			};
			expect(
				() => new SecondSignatureTransaction(invalidSecondSignatureTransaction),
			).not.to.throw();
		});
	});

	describe('#assetToBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).assetToBytes();
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

	describe('#assetToJSON', async () => {
		it('should return an object of type transfer asset', async () => {
			expect(validTestTransaction.assetToJSON())
				.to.be.an('object')
				.and.to.have.property('signature');
		});
	});

	describe('#prepare', async () => {
		it('should call state store', async () => {
			await validTestTransaction.prepare(store);
			expect(storeAccountCacheStub).to.have.been.calledWithExactly([
				{ address: validTestTransaction.senderId },
			]);
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
		it('should call state store', async () => {
			(validTestTransaction as any).applyAsset(store);
			expect(storeAccountGetStub).to.be.calledWithExactly(
				validTestTransaction.senderId,
			);
			expect(storeAccountSetStub).to.be.calledWithExactly(sender.address, {
				...sender,
				secondPublicKey: validTestTransaction.asset.signature.publicKey,
				secondSignature: 1,
			});
		});

		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).to.be.empty;
		});

		it('should return error when secondPublicKey exists on account', async () => {
			storeAccountGetStub.returns({
				...sender,
				secondPublicKey: '123',
			});
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors[0].message).to.contains(
				'Register second signature only allowed once per account.',
			);
		});
	});

	describe('#undoAsset', () => {
		it('should call state store', async () => {
			(validTestTransaction as any).undoAsset(store);
			expect(storeAccountGetStub).to.be.calledWithExactly(
				validTestTransaction.senderId,
			);

			expect(storeAccountSetStub).to.be.calledWithExactly(sender.address, {
				...sender,
				secondSignature: 0,
				secondPublicKey: null,
			});
		});

		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).undoAsset(store);
			expect(errors).to.be.empty;
		});
	});
});
