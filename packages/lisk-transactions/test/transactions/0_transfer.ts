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
import { FEES } from '../../src/constants';
import { BaseTransaction, TransferTransaction } from '../../src/transactions';
import { Status } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';
import { addTransactionFields } from '../helpers';
import {
	validAccount as defaultSenderAccount,
	validTransaction,
	validTransferTransaction as validTransferTransactionWithAssetJSON,
} from '../../fixtures';

// FIXME: Create test_transfer_transaction_class to be able to test protected methods?
describe('Transfer transaction class', () => {
	const defaultTransaction = addTransactionFields(validTransaction);
	let validTransferTransaction: TransferTransaction;
	let validTransferTransactionWithAsset: TransferTransaction;
	beforeEach(async () => {
		validTransferTransaction = new TransferTransaction(defaultTransaction);
		validTransferTransactionWithAsset = new TransferTransaction(validTransferTransactionWithAssetJSON);

	});

	describe('#constructor', () => {
		it('should extend BaseTransaction', async () => {
			expect(validTransferTransaction)
				.to.be.an('object')
				.and.be.instanceof(BaseTransaction);
		});

		it('should be an instance of TransferTransaction', async () => {
			expect(validTransferTransaction)
				.to.be.an('object')
				.and.be.instanceof(TransferTransaction);
		});

		it('should set containsUniqueData to false', () => {
			expect(validTransferTransaction.containsUniqueData).to.be.false;
		});

		it('should set asset', () => {
			expect(validTransferTransaction.asset).to.eql(FEES[0]);
		});

		it('should set fee to transfer transaction fee amount', () => {
			expect(validTransferTransaction.fee).to.eql(FEES[0]);
		});
	});

	describe('#assetToJSON', async () => {
		it('should return an object of type transfer asset', async () => {
			const transferTransactionWithAsset = new TransferTransaction({
				...defaultTransaction,
				asset: { data: 'data' },
			});

			expect(transferTransactionWithAsset.assetToJSON())
				.to.be.an('object')
				.and.to.have.property('data')
				.that.is.a('string');
		});
	});

	describe('#getAssetBytes', () => {
		it('should return a buffer', async () => {
			const transferTransactionWithAsset = new TransferTransaction({
				...defaultTransaction,
				asset: { data: 'data' },
			});

			expect((transferTransactionWithAsset as any).getAssetBytes()).to.eql(
				Buffer.from('64617461', 'hex'),
			);
		});
	});

	describe('#checkSchema', () => {
		it('should return a successful transaction response with a valid transfer transaction', async () => {
			const { id, status, errors } = validTransferTransaction.checkSchema();

			expect(id).to.be.eql(validTransferTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});

		it('should return a failed transaction response with invalid recipientId', async () => {
			const transferTransactionWithInvalidRecipientId = new TransferTransaction(
				{
					...defaultTransaction,
					recipientId: '123456',
				},
			);
			const {
				id,
				status,
				errors,
			} = transferTransactionWithInvalidRecipientId.checkSchema();

			expect(id).to.be.eql(transferTransactionWithInvalidRecipientId.id);
			expect((errors as ReadonlyArray<TransactionError>)[1])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`'.recipientId' should match format "address"`,
				);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response with invalid amount', async () => {
			const transferTransactionWithInvalidAmount = new TransferTransaction({
				...defaultTransaction,
				amount: '9223372036854775808',
			});
			const {
				id,
				status,
				errors,
			} = transferTransactionWithInvalidAmount.checkSchema();

			expect(id).to.be.eql(transferTransactionWithInvalidAmount.id);
			expect((errors as ReadonlyArray<TransactionError>)[1])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`'.amount' should match format "transferAmount"`,
				);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response with invalid asset', async () => {
			const transferTransactionWithInvalidAsset = new TransferTransaction({
				...defaultTransaction,
				asset: { data: [1] },
			});
			const {
				id,
				status,
				errors,
			} = transferTransactionWithInvalidAsset.checkSchema();

			expect(id).to.be.eql(transferTransactionWithInvalidAsset.id);
			expect((errors as ReadonlyArray<TransactionError>)[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property('message', `'.asset.data' should be string`);
			expect(status).to.eql(Status.FAIL);
		});
	});

	describe('#getRequiredAttributes', () => {
		it('should return an object with property `ACCOUNTS` containing address of sender and recipient', async () => {
			const expectedAddressArray = [
				'18278674964748191682L',
				'17243547555692708431L',
			];
			const requiredAttributes: any = validTransferTransaction.getRequiredAttributes();
			expect(requiredAttributes)
				.to.be.an('object')
				.and.to.have.property('ACCOUNTS');

			expect(requiredAttributes['ACCOUNTS']).to.be.eql(expectedAddressArray);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a successful transaction response', async () => {
			const {
				id,
				status,
				errors,
			} = validTransferTransaction.verifyAgainstOtherTransactions();
			expect(id).to.be.eql(validTransferTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});
	});

	describe('#apply', () => {
		it('should return an updated sender account with balance minus transaction fee plus amount', async () => {
			const { state } = validTransferTransaction.apply({ sender: defaultSenderAccount});
			expect(state).to.be.an('object');
			expect(state.account)
				.to.be.an('object')
				.and.to.have.property('balance', '0');
		});
	});

	describe('#undo', () => {
		it('should return sender account with original balance', async () => {
			const { state } = validTransferTransaction.apply(
				{ sender: defaultSenderAccount },
			);
			const { state: undoneState } = validTransferTransaction.undo(
				{ sender: state.sender },
			);
			expect(undoneState).to.be.an('object').and.to.have.property('account');
			expect(undoneState.account)
				.to.be.an('object')
				.and.to.have.property('balance', '10000000');
		});
	});
});
