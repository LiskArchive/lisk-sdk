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
import * as BigNum from '@liskhq/bignum';
import { expect } from 'chai';
import { MAX_TRANSACTION_AMOUNT, TRANSFER_FEE } from '../src/constants';
import { TransferTransaction } from '../src/0_transfer_transaction';
import { Account } from '../src/transaction_types';
import { Status } from '../src/response';
import { TransactionError } from '../src/errors';
import { addTransactionFields, MockStateStore as store } from './helpers';
import { validTransferAccount, validTransferTransactions } from '../fixtures';

describe('Transfer transaction class', () => {
	const validTransferTransaction = addTransactionFields(
		validTransferTransactions[0],
	);
	const validSelfTransferTransaction = addTransactionFields(
		validTransferTransactions[1],
	);
	let validTransferTestTransaction: TransferTransaction;
	let validSelfTransferTestTransaction: TransferTransaction;
	let sender: Account;
	let recipient: Account;
	let storeAccountCacheStub: sinon.SinonStub;
	let storeAccountGetStub: sinon.SinonStub;
	let storeAccountGetOrDefaultStub: sinon.SinonStub;
	let storeAccountSetStub: sinon.SinonStub;

	beforeEach(async () => {
		validTransferTestTransaction = new TransferTransaction(
			validTransferTransaction,
		);
		validSelfTransferTestTransaction = new TransferTransaction(
			validSelfTransferTransaction,
		);
		sender = validTransferAccount[0];
		recipient = validTransferAccount[1];
		storeAccountCacheStub = sandbox.stub(store.account, 'cache');
		storeAccountGetStub = sandbox.stub(store.account, 'get').returns(sender);
		storeAccountGetOrDefaultStub = sandbox
			.stub(store.account, 'getOrDefault')
			.returns(recipient);
		storeAccountSetStub = sandbox.stub(store.account, 'set');
	});

	describe('#constructor', () => {
		it('should create instance of TransferTransaction', async () => {
			expect(validSelfTransferTestTransaction)
				.to.be.an('object')
				.and.be.instanceof(TransferTransaction);
		});

		it('should set transfer asset data', async () => {
			expect(validSelfTransferTestTransaction.asset.data).to.eql(
				validSelfTransferTestTransaction.asset.data,
			);
		});

		it('should set transfer asset amount', async () => {
			expect(validSelfTransferTestTransaction.asset.amount.toString()).to.eql(
				validSelfTransferTransaction.asset.amount,
			);
		});

		it('should set transfer asset recipientId', async () => {
			expect(validSelfTransferTestTransaction.asset.recipientId).to.eql(
				validSelfTransferTransaction.asset.recipientId,
			);
		});

		it('should set fee to transfer transaction fee amount', async () => {
			expect(validSelfTransferTestTransaction.fee.toString()).to.eql(
				TRANSFER_FEE.toString(),
			);
		});
	});

	describe('#getBasicBytes', () => {
		// generated using TransferTransaction@2.0.2
		const expectedBytes =
			'00c40068049becd3e545be91f85270d8a796ae3b9e8ec01a8cb479fef46a298b4efd943a0f65b7848a47afca70010000000000000061';
		it('should return a buffer', async () => {
			const basicBytes = (validSelfTransferTestTransaction as any).getBasicBytes();
			expect(basicBytes).to.eql(Buffer.from(expectedBytes, 'hex'));
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a successful transaction response', async () => {
			const {
				id,
				status,
				errors,
			} = validTransferTestTransaction.verifyAgainstOtherTransactions([]);
			expect(id).to.be.eql(validTransferTransaction.id);
			expect(errors).to.be.empty;
			expect(status).to.eql(Status.OK);
		});
	});

	describe('#assetToJSON', async () => {
		it('should return an object of type transfer asset', async () => {
			expect(validSelfTransferTestTransaction.assetToJSON())
				.to.be.an('object')
				.and.to.have.property('data')
				.that.is.a('string');
		});
	});

	describe('#prepare', async () => {
		it('should call state store', async () => {
			await validSelfTransferTestTransaction.prepare(store);
			expect(storeAccountCacheStub).to.have.been.calledWithExactly([
				{ address: validSelfTransferTestTransaction.senderId },
				{ address: validSelfTransferTestTransaction.asset.recipientId },
			]);
		});
	});

	describe('#validateAsset', () => {
		it('should return no errors with a valid transfer transaction', async () => {
			const errors = (validTransferTestTransaction as any).validateAsset();
			expect(errors).to.be.empty;
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

			expect(errors[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					'\'.recipientId\' should match format "address"',
				);
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

			expect(errors[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Amount must be a valid number in string format.`,
				);
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

			expect(errors[0]).to.be.instanceof(TransactionError);
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

			expect(errors[0]).to.be.instanceof(TransactionError);
		});
	});

	describe('#applyAsset', () => {
		it('should return no errors', async () => {
			const errors = (validTransferTestTransaction as any).applyAsset(store);
			expect(errors).to.be.empty;
		});

		it('should call state store', async () => {
			(validTransferTestTransaction as any).applyAsset(store);
			expect(storeAccountGetStub).to.be.calledWithExactly(
				validTransferTestTransaction.senderId,
			);
			expect(
				storeAccountSetStub.getCall(0).calledWithExactly(sender.address, {
					...sender,
					balance: new BigNum(sender.balance)
						.sub(validTransferTestTransaction.asset.amount)
						.toString(),
				}),
			);
			expect(storeAccountGetOrDefaultStub).to.be.calledWithExactly(
				validTransferTestTransaction.asset.recipientId,
			);
			expect(
				storeAccountSetStub.getCall(1).calledWithExactly(recipient.address, {
					...recipient,
					balance: new BigNum(recipient.balance)
						.add(validTransferTestTransaction.asset.amount)
						.toString(),
				}),
			);
		});

		it('should return error when sender balance is insufficient', async () => {
			storeAccountGetStub.returns({
				...sender,
				balance: new BigNum(10000000),
			});
			const errors = (validTransferTestTransaction as any).applyAsset(store);
			expect(errors).to.have.length(1);
			expect(errors[0].message).to.equal(
				`Account does not have enough LSK: ${sender.address}, balance: 0.2`,
			);
		});

		it('should return error when recipient balance is over maximum amount', async () => {
			storeAccountGetOrDefaultStub.returns({
				...sender,
				balance: new BigNum(MAX_TRANSACTION_AMOUNT),
			});
			const errors = (validTransferTestTransaction as any).applyAsset(store);
			expect(errors[0]).and.to.have.property('message', 'Invalid amount');
		});
	});

	describe('#undoAsset', () => {
		it('should call state store', async () => {
			(validTransferTestTransaction as any).undoAsset(store);
			expect(storeAccountGetStub).to.be.calledWithExactly(
				validTransferTestTransaction.senderId,
			);
			expect(
				storeAccountSetStub.getCall(0).calledWithExactly(sender.address, {
					...sender,
					balance: new BigNum(sender.balance)
						.add(validTransferTestTransaction.asset.amount)
						.toString(),
				}),
			);
			expect(storeAccountGetOrDefaultStub).to.be.calledWithExactly(
				validTransferTestTransaction.asset.recipientId,
			);
			expect(
				storeAccountSetStub.getCall(1).calledWithExactly(recipient.address, {
					...recipient,
					balance: new BigNum(recipient.balance)
						.sub(validTransferTestTransaction.asset.amount)
						.toString(),
				}),
			);
		});

		it('should return error when recipient balance is insufficient', async () => {
			storeAccountGetOrDefaultStub.returns({
				...recipient,
				balance: new BigNum('0'),
			});
			const errors = (validTransferTestTransaction as any).undoAsset(store);
			expect(errors[0].message).to.equal(
				`Account does not have enough LSK: ${recipient.address}, balance: 0`,
			);
		});

		it('should return error when sender balance is over maximum amount', async () => {
			storeAccountGetStub.returns({
				...recipient,
				balance: new BigNum(MAX_TRANSACTION_AMOUNT),
			});
			const errors = (validTransferTestTransaction as any).undoAsset(store);
			expect(errors[0]).and.to.have.property('message', 'Invalid amount');
		});
	});
});
