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
import * as BigNum from 'browserify-bignum';
import { expect } from 'chai';
import { MAX_TRANSACTION_AMOUNT, TRANSFER_FEE } from '../../src/constants';
import { Attributes, TransferTransaction } from '../../src/transactions';
import { Account, Status } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';
import { addTransactionFields } from '../helpers';
import {
	validTransferAccount,
	validTransferTransactions,
} from '../../fixtures';

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
	let selfAccount: Account;

	beforeEach(async () => {
		validTransferTestTransaction = new TransferTransaction(
			validTransferTransaction,
		);
		validSelfTransferTestTransaction = new TransferTransaction(
			validSelfTransferTransaction,
		);
		sender = validTransferAccount[0];
		recipient = validTransferAccount[1];
		selfAccount = validTransferAccount[2];
	});

	describe('#constructor', () => {
		it('should create instance of TransferTransaction', async () => {
			expect(validSelfTransferTestTransaction)
				.to.be.an('object')
				.and.be.instanceof(TransferTransaction);
		});

		it('should set transfer asset', () => {
			expect(validSelfTransferTestTransaction.asset).to.eql({ data: 'a' });
		});

		it('should set fee to transfer transaction fee amount', () => {
			expect(validSelfTransferTestTransaction.fee.toString()).to.eql(
				TRANSFER_FEE.toString(),
			);
		});
	});

	describe('#getAssetBytes', () => {
		it('should return a buffer', async () => {
			const expectedBytes = '61';
			const assetBytes = (validSelfTransferTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(Buffer.from(expectedBytes, 'hex'));
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a successful transaction response', async () => {
			const {
				id,
				status,
				errors,
			} = validTransferTestTransaction.verifyAgainstOtherTransactions();
			expect(id).to.be.eql(validTransferTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});
	});

	describe('#getRequiredAttributes', () => {
		let attribute: Attributes;

		beforeEach(async () => {
			attribute = validTransferTestTransaction.getRequiredAttributes();
		});

		it('should return return attribute including sender and recipient address', async () => {
			const expectedAddresses = [
				'1977368676922172803L',
				'7675634738153324567L',
			];
			expect(attribute)
				.to.be.an('object')
				.and.to.have.property('account');
			expect(attribute['account'])
				.to.have.property('address')
				.and.to.be.eql(expectedAddresses);
		});
	});

	describe('#processRequiredState', () => {
		it('should return sender and recipient', async () => {
			const validEntity = {
				account: [sender, recipient],
			};
			expect(
				validTransferTestTransaction.processRequiredState(validEntity).sender,
			).to.eql(sender);
			expect(
				validTransferTestTransaction.processRequiredState(validEntity)
					.recipient,
			).to.eql(recipient);
		});

		it('should throw an error when account state does not include the sender', async () => {
			const invalidEntity = {
				account: [recipient],
			};
			expect(
				validTransferTestTransaction.processRequiredState.bind(
					validTransferTestTransaction,
					invalidEntity,
				),
			).to.throw('No sender account is found.');
		});

		it('should throw an error when account state does not include the recipient', async () => {
			const invalidEntity = {
				account: [sender],
			};

			expect(
				validTransferTestTransaction.processRequiredState.bind(
					validTransferTestTransaction,
					invalidEntity,
				),
			).to.throw('No recipient account is found.');
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

	describe('#validateSchema', () => {
		it('should return a successful transaction response with a valid transfer transaction', async () => {
			const {
				id,
				status,
				errors,
			} = validSelfTransferTestTransaction.validateSchema();

			expect(id).to.be.eql(validSelfTransferTestTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});

		it('should return a failed transaction response with invalid recipientId', async () => {
			const transferTransactionWithInvalidRecipientId = new TransferTransaction(
				{
					...validTransferTransaction,
					recipientId: '123456',
				},
			);
			const {
				id,
				status,
				errors,
			} = transferTransactionWithInvalidRecipientId.validateSchema();

			expect(id).to.be.eql(transferTransactionWithInvalidRecipientId.id);
			expect(errors[1])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					'Address format does not match requirements. Expected "L" at the end.',
				);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response with invalid amount', async () => {
			const transferTransactionWithInvalidAmount = new TransferTransaction({
				...validTransferTransaction,
				amount: '9223372036854775808',
			});
			const {
				id,
				status,
				errors,
			} = transferTransactionWithInvalidAmount.validateSchema();

			expect(id).to.be.eql(transferTransactionWithInvalidAmount.id);
			expect(errors[1])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Amount must be a valid number in string format.`,
				);
			expect(status).to.eql(Status.FAIL);
		});

		it('should return a failed transaction response with invalid asset', async () => {
			const transferTransactionWithInvalidAsset = new TransferTransaction({
				...validTransferTransaction,
				asset: {
					data:
						'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
				},
			});
			const {
				id,
				status,
				errors,
			} = transferTransactionWithInvalidAsset.validateSchema();

			expect(id).to.be.eql(transferTransactionWithInvalidAsset.id);
			expect(errors[0]).to.be.instanceof(TransactionError);
			expect(status).to.eql(Status.FAIL);
		});
	});

	describe('#verify', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTransferTestTransaction.verify({
				sender,
				recipient,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return a failed transaction response when sender balance is insufficient', async () => {
			const { status, errors } = validTransferTestTransaction.verify({
				sender: {
					...sender,
					balance: '0',
				},
				recipient,
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Account does not have enough LSK: ${sender.address}, balance: 0`,
				);
		});

		it('should return a failed transaction response when recipient balance is over maximum amount', async () => {
			const { status, errors } = validTransferTestTransaction.verify({
				sender,
				recipient: { ...recipient, balance: MAX_TRANSACTION_AMOUNT },
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property('message', 'Invalid amount');
		});

		describe('when self transfer', () => {
			it('should return TransactionResponse with status OK', async () => {
				const { status, errors } = validSelfTransferTestTransaction.verify({
					sender: selfAccount,
					recipient: selfAccount,
				});

				expect(status).to.equal(Status.OK);
				expect(errors).to.be.empty;
			});

			it('should return a failed transaction response when sender balance is insufficient', async () => {
				const { status, errors } = validSelfTransferTestTransaction.verify({
					sender: {
						...selfAccount,
						balance: '0',
					},
					recipient: selfAccount,
				});
				expect(status).to.eql(Status.FAIL);
				expect(errors[0])
					.to.be.instanceof(TransactionError)
					.and.to.have.property(
						'message',
						`Account does not have enough LSK: ${
							selfAccount.address
						}, balance: 0`,
					);
			});

			it('should return a failed transaction response when recipient balance is over maximum amount', async () => {
				const { status, errors } = validSelfTransferTestTransaction.verify({
					sender: selfAccount,
					recipient: { ...selfAccount, balance: MAX_TRANSACTION_AMOUNT },
				});
				expect(status).to.eql(Status.FAIL);
				expect(errors[0])
					.to.be.instanceof(TransactionError)
					.and.to.have.property('message', 'Invalid amount');
			});
		});
	});

	describe('#apply', () => {
		it('should return a successful transaction response', async () => {
			const { status, state, errors } = validTransferTestTransaction.apply({
				sender,
				recipient,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
			expect(state).to.be.an('object');
			expect((state as any).sender)
				.to.be.an('object')
				.and.to.have.property(
					'balance',
					new BigNum(sender.balance)
						.sub(validTransferTestTransaction.fee)
						.sub(validTransferTestTransaction.amount)
						.toString(),
				);
		});

		it('should return a transaction response with error when sender balance is insufficient', async () => {
			const { status, errors } = validTransferTestTransaction.apply({
				sender: {
					...sender,
					balance: '0',
				},
				recipient,
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors[0].message).to.equal(
				`Account does not have enough LSK: ${sender.address}, balance: 0`,
			);
		});

		it('should return a transaction response with error when recipient balance is over maximum amount', async () => {
			const { status, errors } = validTransferTestTransaction.apply({
				sender,
				recipient: { ...recipient, balance: MAX_TRANSACTION_AMOUNT },
			});

			expect(status).to.eql(Status.FAIL);
			expect(errors[0]).and.to.have.property('message', 'Invalid amount');
		});

		describe('when sender and recipient are the same', () => {
			it('should return sender and recipient with the same result', async () => {
				const { state } = validSelfTransferTestTransaction.apply({
					sender: selfAccount,
					recipient: selfAccount,
				});
				expect((state as any).sender.address).to.equal(
					(state as any).recipient.address,
				);
				expect((state as any).sender.balance).to.equal(
					(state as any).recipient.balance,
				);
			});

			it('should return sender where only subtracted the fee', async () => {
				const { state } = validSelfTransferTestTransaction.apply({
					sender: selfAccount,
					recipient: selfAccount,
				});

				expect((state as any).sender.balance).to.equal(
					new BigNum(selfAccount.balance)
						.sub(validSelfTransferTestTransaction.fee)
						.toString(),
				);
			});
		});
	});

	describe('#undo', () => {
		it('should return a successful transaction response', async () => {
			const { status, state, errors } = validTransferTestTransaction.undo({
				sender,
				recipient,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
			expect(state).to.be.an('object');
			expect((state as any).sender)
				.to.be.an('object')
				.and.to.have.property(
					'balance',
					new BigNum(sender.balance)
						.add(validTransferTestTransaction.fee)
						.add(validTransferTestTransaction.amount)
						.toString(),
				);
		});

		it('should return a transaction response with error when recipient balance is insufficient', async () => {
			const { status, errors } = validTransferTestTransaction.undo({
				sender,
				recipient: {
					...recipient,
					balance: '0',
				},
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors[0].message).to.equal(
				`Account does not have enough LSK: ${recipient.address}, balance: 0`,
			);
		});

		it('should return a transaction response with error when sender balance is over maximum amount', async () => {
			const { status, errors } = validTransferTestTransaction.undo({
				sender: { ...sender, balance: MAX_TRANSACTION_AMOUNT },
				recipient,
			});

			expect(status).to.eql(Status.FAIL);
			expect(errors[0]).and.to.have.property(
				'message',
				'Invalid balance amount',
			);
		});

		describe('when sender and recipient are the same', () => {
			it('should return sender and recipient with the same result', async () => {
				const { state } = validSelfTransferTestTransaction.undo({
					sender: selfAccount,
					recipient: selfAccount,
				});
				expect((state as any).sender.address).to.equal(
					(state as any).recipient.address,
				);
				expect((state as any).sender.balance).to.equal(
					(state as any).recipient.balance,
				);
			});

			it('should return sender where only added the fee', async () => {
				const { state } = validSelfTransferTestTransaction.undo({
					sender: selfAccount,
					recipient: selfAccount,
				});

				expect((state as any).sender.balance).to.equal(
					new BigNum(selfAccount.balance)
						.add(validSelfTransferTestTransaction.fee)
						.toString(),
				);
			});
		});
	});
});
