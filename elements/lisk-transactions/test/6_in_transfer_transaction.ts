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
import * as BigNum from '@liskhq/bignum';
import { expect } from 'chai';
import { MockStateStore as store } from './helpers';
import { InTransferTransaction } from '../src/6_in_transfer_transaction';
import {
	validInTransferTransactions,
	validDappTransactions,
} from '../fixtures';
import { TransactionJSON } from '../src/transaction_types';
import { Status } from '../src/response';

describe('InTransfer transaction class', () => {
	const defaultTransaction = validInTransferTransactions[0];
	const defaultValidSender = {
		address: '13155556493249255133L',
		balance: '1000000000',
		publicKey:
			'305b4897abc230c1cc9d0aa3bf0c75747bfa42f32f83f5a92348edea528850ad',
	};
	const defaultValidTxs = [
		{
			id: '13227044664082109069',
			type: 5,
			senderId: '18237045742439723234L',
		},
	];
	const dappRegistrationTx = validDappTransactions[3];

	let validTestTransaction: InTransferTransaction;
	let storeAccountCacheStub: sinon.SinonStub;
	let storeAccountGetStub: sinon.SinonStub;
	let storeAccountSetStub: sinon.SinonStub;
	let storeTransactionCacheStub: sinon.SinonStub;
	let storeTransactionGetStub: sinon.SinonStub;
	let storeTransactionFindStub: sinon.SinonStub;

	beforeEach(async () => {
		validTestTransaction = new InTransferTransaction(defaultTransaction);
		storeAccountCacheStub = sandbox.stub(store.account, 'cache');
		storeAccountGetStub = sandbox
			.stub(store.account, 'get')
			.returns(defaultValidSender);
		storeAccountSetStub = sandbox.stub(store.account, 'set');
		storeTransactionCacheStub = sandbox.stub(store.transaction, 'cache');
		storeTransactionGetStub = sandbox
			.stub(store.transaction, 'get')
			.returns(dappRegistrationTx);
		storeTransactionFindStub = sandbox
			.stub(store.transaction, 'find')
			.returns(() => defaultValidTxs[0]);
	});

	describe('#constructor', () => {
		it('should create instance of InTransferTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(InTransferTransaction);
		});

		it('should set the inTransfer asset', async () => {
			expect(validTestTransaction.asset.inTransfer).to.be.an('object');
			expect(validTestTransaction.asset.inTransfer.dappId).to.equal(
				defaultTransaction.asset.inTransfer.dappId,
			);
		});

		it('should not throw TransactionMultiError when asset is not string', async () => {
			const invalidInTransferTransactionData = {
				...defaultTransaction,
				asset: {
					inTransfer: {
						dappId: 1,
					},
				},
			};
			expect(
				() => new InTransferTransaction(invalidInTransferTransactionData),
			).not.to.throw();
		});
	});

	describe('#assetToBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).assetToBytes();
			expect(assetBytes).to.eql(
				Buffer.from(defaultTransaction.asset.inTransfer.dappId, 'utf8'),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validInTransferTransactions[1],
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});
	});

	describe('#assetToJSON', async () => {
		it('should return an object of type transfer asset', async () => {
			expect(validTestTransaction.assetToJSON())
				.to.be.an('object')
				.and.to.have.property('inTransfer');
		});
	});

	describe('#prepare', async () => {
		it('should call state store', async () => {
			storeTransactionCacheStub.onCall(0).returns([dappRegistrationTx]);
			await validTestTransaction.prepare(store);
			expect(
				storeAccountCacheStub
					.getCall(0)
					.calledWithExactly([{ address: validTestTransaction.senderId }]),
			);
			expect(
				storeAccountCacheStub
					.getCall(1)
					.calledWithExactly([{ id: dappRegistrationTx.senderId }]),
			);
		});
	});

	describe('#validateAsset', () => {
		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).validateAsset();
			expect(errors).to.be.empty;
		});

		it('should return error when asset includes non id format dappId', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				id: '17748758437863626387',
				asset: {
					inTransfer: {
						dappId: 'id-not-id-format-zzzzz',
					},
				},
			};
			const transaction = new InTransferTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.inTransfer.dappId');
		});

		it('should return error when recipientId is not empty', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				id: '1070575047580588345',
				recipientId: '13155556493249255133L',
			};
			const transaction = new InTransferTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.recipientId');
		});

		it('should return error when recipientPublicKey is not empty', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				recipientPublicKey:
					'305b4897abc230c1cc9d0aa3bf0c75747bfa42f32f83f5a92348edea528850ad',
			};
			const transaction = new InTransferTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.recipientPublicKey');
		});

		it('should return error when amount is zero', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				id: '16332529042692216279',
				amount: '0',
			};
			const transaction = new InTransferTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.amount');
		});
	});

	describe('#applyAsset', () => {
		it('should call state store', async () => {
			(validTestTransaction as any).applyAsset(store);
			expect(storeTransactionFindStub).to.be.calledOnce;
			expect(
				storeAccountGetStub
					.getCall(0)
					.calledWithExactly(validTestTransaction.senderId),
			);
			expect(
				storeAccountSetStub
					.getCall(0)
					.calledWithExactly(defaultValidSender.address, {
						...defaultValidSender,
						balance: new BigNum(defaultValidSender.balance)
							.sub(validTestTransaction.amount)
							.toString(),
					}),
			);
			expect(storeTransactionGetStub).to.be.calledWithExactly(
				validTestTransaction.asset.inTransfer.dappId,
			);
			expect(
				storeAccountGetStub
					.getCall(1)
					.calledWithExactly(dappRegistrationTx.senderId),
			);
		});

		it('should return error when dapp registration tx not found', async () => {
			storeTransactionFindStub.returns(undefined);

			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).not.to.be.empty;
		});

		it('should return error when sender balance insufficient', async () => {
			storeAccountGetStub.returns({ ...defaultValidSender, balance: '0' });

			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).not.to.be.empty;
		});

		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).applyAsset(store);

			expect(errors).to.be.empty;
		});
	});

	describe('#undoAsset', () => {
		it('should call state store', async () => {
			(validTestTransaction as any).undoAsset(store);
			expect(
				storeAccountGetStub
					.getCall(0)
					.calledWithExactly(validTestTransaction.senderId),
			);
			expect(
				storeAccountSetStub
					.getCall(0)
					.calledWithExactly(defaultValidSender.address, {
						...defaultValidSender,
						balance: new BigNum(defaultValidSender.balance)
							.add(validTestTransaction.amount)
							.toString(),
					}),
			);
			expect(storeTransactionGetStub).to.be.calledWithExactly(
				validTestTransaction.asset.inTransfer.dappId,
			);
			expect(
				storeAccountGetStub
					.getCall(1)
					.calledWithExactly(dappRegistrationTx.senderId),
			);
		});

		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).undoAsset(store);

			expect(errors).to.be.empty;
		});
	});
});
