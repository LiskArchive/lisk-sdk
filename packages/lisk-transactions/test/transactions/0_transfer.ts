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
import { SinonStub } from 'sinon';
import { FEES, MAX_TRANSACTION_AMOUNT } from '../../src/constants';
import { Attributes, TransferTransaction } from '../../src/transactions';
import { Account, Status } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';
import { addTransactionFields } from '../helpers';
import {
	validTransferAccount,
	validTransferTransactions,
} from '../../fixtures';
import * as utils from '../../src/utils';

describe('Transfer transaction class', () => {
	const defaultTransaction = addTransactionFields(validTransferTransactions[1]);
	let validTestTransaction: TransferTransaction;
	let sender: Account;
	let recipient: Account;

	beforeEach(async () => {
		validTestTransaction = new TransferTransaction(defaultTransaction);
		sender = validTransferAccount;
		recipient = validTransferAccount;
	});

	describe('#constructor', () => {
		it('should create instance of TransferTransaction', async () => {
			expect(validTestTransaction)
				.to.be.an('object')
				.and.be.instanceof(TransferTransaction);
		});

		it('should set containsUniqueData to false', () => {
			expect(validTestTransaction.containsUniqueData).to.be.false;
		});

		it('should set transfer asset', () => {
			expect(validTestTransaction.asset).to.eql({ data: 'a' });
		});

		it('should set fee to transfer transaction fee amount', () => {
			expect(validTestTransaction.fee.toString()).to.eql(FEES[0].toString());
		});
	});

	describe('#create', () => {
		const timeWithOffset = 38350076;
		const passphrase = 'secret';
		const secondPassphrase = 'second secret';
		let result: object;

		beforeEach(async () => {
			sandbox.stub(utils, 'getTimeWithOffset').returns(timeWithOffset);
		});

		describe('when the transaction is created with one passphrase and asset data', () => {
			beforeEach(async () => {
				result = TransferTransaction.create({
					passphrase,
					amount: '1000',
					recipientId: '1L',
					data: 'tx info',
				});
			});

			it('should create transfer transaction ', async () => {
				expect(result).to.have.property('id');
				expect(result).to.have.property('type', 0);
				expect(result).to.have.property('amount', '1000');
				expect(result).to.have.property('fee', FEES[0].toString());
				expect(result).to.have.property('senderId');
				expect(result).to.have.property('senderPublicKey');
				expect(result).to.have.property('recipientId', '1L');
				expect(result).to.have.property('timestamp', timeWithOffset);
				expect(result).to.have.property('signature').and.not.to.be.empty;
				expect((result as any).asset.data).to.eql('tx info');
			});

			it('should use time.getTimeWithOffset to calculate the timestamp', async () => {
				expect(utils.getTimeWithOffset).to.be.calledWithExactly(undefined);
			});

			it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', async () => {
				const offset = -10;
				TransferTransaction.create({
					passphrase,
					amount: '1000',
					recipientId: '1L',
					data: 'a',
					timeOffset: offset,
				});
				expect(utils.getTimeWithOffset).to.be.calledWithExactly(offset);
			});
		});

		describe('when the transaction is created with first and second passphrase and no asset data', () => {
			beforeEach(async () => {
				result = TransferTransaction.create({
					amount: '1000',
					recipientId: '1L',
					passphrase,
					secondPassphrase,
				});
			});

			it('should create transfer transaction ', async () => {
				expect(result).to.have.property('id');
				expect(result).to.have.property('type', 0);
				expect(result).to.have.property('amount', '1000');
				expect(result).to.have.property('fee', FEES[0].toString());
				expect(result).to.have.property('senderId');
				expect(result).to.have.property('senderPublicKey');
				expect(result).to.have.property('recipientId', '1L');
				expect(result).to.have.property('timestamp', timeWithOffset);
				expect(result).to.have.property('signature').and.not.to.be.empty;
				expect(result).to.have.property('signSignature').and.not.to.be.empty;
			});
		});

		describe('when the transaction is created with invalid inputs', () => {
			it('should throw an invalid input error when data is not string', () => {
				expect(
					TransferTransaction.create.bind(undefined, {
						passphrase,
						amount: '1000',
						recipientId: '18278674964748191682L',
						data: 1 as any,
					}),
				).to.throw('Invalid asset types');
			});

			it('should throw an invalid input error when data is too long', () => {
				expect(
					TransferTransaction.create.bind(undefined, {
						passphrase,
						secondPassphrase,
						amount: '1000',
						recipientId: '18278674964748191682L',
						data:
							'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
					}),
				).to.throw('Transaction data field cannot exceed 64 bytes.');
			});

			it('should throw an invalid input error when amount is invalid', () => {
				expect(
					TransferTransaction.create.bind(undefined, {
						passphrase,
						secondPassphrase,
						amount: 1000 as any,
						recipientId: '18278674964748191682L',
					}),
				).to.throw('Amount must be a valid number in string format.');
			});

			it('should throw an invalid input error when recipientId not provided', () => {
				expect(
					TransferTransaction.create.bind(undefined, {
						passphrase,
						secondPassphrase,
						amount: '1000',
					}),
				).to.throw('`recipientId` must be provided.');
			});

			it('should throw an invalid input error when recipientId does not match recipientPublicKey', () => {
				expect(
					TransferTransaction.create.bind(undefined, {
						passphrase,
						secondPassphrase,
						amount: '1000',
						recipientId: '18278674964748191682L',
						recipientPublicKey:
							'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
					}),
				).to.throw('recipientId does not match recipientPublicKey.');
			});
		});

		describe('when the transaction is created without passphrase', () => {
			beforeEach(async () => {
				result = TransferTransaction.create({
					amount: '1000',
					recipientId: '18278674964748191682L',
				});
			});

			it('should create transfer transaction ', async () => {
				expect(result).to.have.property('type', 0);
				expect(result).to.have.property('amount', '1000');
				expect(result).to.have.property('fee', FEES[0].toString());
				expect(result)
					.to.have.property('timestamp')
					.and.equal(timeWithOffset);
				expect((result as any).senderPublicKey).to.be.undefined;
				expect(result)
					.to.have.property('recipientId')
					.and.to.equal('18278674964748191682L');
				expect(result).not.to.have.property('id');
				expect(result).not.to.have.property('signature');
				expect(result).not.to.have.property('signSignature');
			});
		});
	});

	describe('#fromJSON', () => {
		beforeEach(async () => {
			sandbox.stub(TransferTransaction.prototype, 'validateSchema').returns({
				id: defaultTransaction.id,
				status: Status.OK,
				errors: [],
			});
			validTestTransaction = TransferTransaction.fromJSON(defaultTransaction);
		});

		it('should create instance of TransferTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(TransferTransaction);
		});

		it('should call validateSchema', async () => {
			expect(validTestTransaction.validateSchema).to.be.calledOnce;
		});

		it('should throw an error if validateSchema returns error', async () => {
			(TransferTransaction.prototype.validateSchema as SinonStub).returns({
				status: Status.FAIL,
				errors: [new TransactionError()],
			});
			expect(
				TransferTransaction.fromJSON.bind(undefined, defaultTransaction),
			).to.throw('Failed to validate schema');
		});
	});

	describe('#getAssetBytes', () => {
		it('should return a buffer', async () => {
			const expectedBytes = '61';
			const assetBytes = (validTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(Buffer.from(expectedBytes, 'hex'));
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return a successful transaction response', async () => {
			const {
				id,
				status,
				errors,
			} = validTestTransaction.verifyAgainstOtherTransactions();
			expect(id).to.be.eql(defaultTransaction.id);
			expect(errors).to.be.eql([]);
			expect(status).to.eql(Status.OK);
		});
	});

	describe('#getRequiredAttributes', () => {
		let attribute: Attributes;

		beforeEach(async () => {
			attribute = validTestTransaction.getRequiredAttributes();
		});

		it('should return return attribute including sender and recipient address', async () => {
			const expectedAddresses = [
				'7329472648011827824L',
				'7329472648011827824L',
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
		beforeEach(async () => {
			validTestTransaction = new TransferTransaction(defaultTransaction);
		});

		it('should return sender and recipient', async () => {
			const validEntity = {
				account: [sender, recipient],
			};
			expect(
				validTestTransaction.processRequiredState(validEntity).sender,
			).to.eql(sender);
			expect(
				validTestTransaction.processRequiredState(validEntity).recipient,
			).to.eql(recipient);
		});

		it('should throw an error when account state does not include the sender', async () => {
			const invalidEntity = {
				account: [
					{
						address: '1L',
						publicKey:
							'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
					},
				],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('No sender account is found.');
		});

		it('should throw an error when account state does not include the recipient', async () => {
			const TestTransaction = new TransferTransaction({
				...defaultTransaction,
				senderId: defaultTransaction.senderId.replace('0', '1'),
			});
			const invalidEntity = {
				account: [
					{ ...sender, address: defaultTransaction.senderId.replace('0', '1') },
					{
						address: '1L',
						publicKey:
							'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
					},
				],
			};
			expect(
				TestTransaction.processRequiredState.bind(
					TestTransaction,
					invalidEntity,
				),
			).to.throw('No recipient account is found.');
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

	describe('#validateSchema', () => {
		it('should return a successful transaction response with a valid transfer transaction', async () => {
			const { id, status, errors } = validTestTransaction.validateSchema();

			expect(id).to.be.eql(validTestTransaction.id);
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
				...defaultTransaction,
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
				...defaultTransaction,
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
			const { status, errors } = validTestTransaction.verify({
				sender,
				recipient,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return a failed transaction response when sender balance is insufficient', async () => {
			const { status, errors } = validTestTransaction.verify({
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
			const invalidTestTransaction = new TransferTransaction({
				...defaultTransaction,
				amount: MAX_TRANSACTION_AMOUNT,
			});
			const { status, errors } = invalidTestTransaction.verify({
				sender,
				recipient,
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors[0])
				.to.be.instanceof(TransactionError)
				.and.to.have.property(
					'message',
					`Account does not have enough LSK: ${sender.address}, balance: ${
						sender.balance
					}`,
				);
		});
	});

	describe('#apply', () => {
		it('should return a successful transaction response', async () => {
			const { status, state, errors } = validTestTransaction.apply({
				sender,
				recipient,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
			expect(state).to.be.an('object');
			expect((state as any).sender)
				.to.be.an('object')
				.and.to.have.property('balance', '154660001749');
		});

		it('should return a transaction response with error when sender balance is insufficient', async () => {
			const { status, errors } = validTestTransaction.apply({
				sender: {
					...sender,
					balance: '0',
				},
				recipient,
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message)
				.to.equal(
					`Account does not have enough LSK: ${sender.address}, balance: 0`,
				);
		});
	});

	describe('#undo', () => {
		it('should return a successful transaction response', async () => {
			const { status, state, errors } = validTestTransaction.undo({
				sender,
				recipient,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
			expect(state).to.be.an('object');
			expect((state as any).sender)
				.to.be.an('object')
				.and.to.have.property('balance', '154680001749');
		});

		it('should return a transaction response with error when recipient balance is over maximum amount', async () => {
			const invalidTestTransaction = new TransferTransaction({
				...defaultTransaction,
				amount: MAX_TRANSACTION_AMOUNT,
			});
			const { status, errors } = invalidTestTransaction.undo({
				sender,
				recipient,
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors[0])
				.and.to.have.property('message', 'Invalid amount');
		});
	});
});
