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
import {
	Attributes,
	BaseTransaction,
	DelegateTransaction,
} from '../../src/transactions';
import {
	validDelegateAccount,
	validDelegateTransaction,
	validTransaction,
} from '../../fixtures';
import { Account, Status, TransactionJSON } from '../../src/transaction_types';

describe('Delegate registration transaction class', () => {
	let validTestTransaction: DelegateTransaction;
	let sender: Account;
	let nonDelegateAccount: Account;

	beforeEach(async () => {
		validTestTransaction = new DelegateTransaction(validDelegateTransaction);
		sender = validDelegateAccount;
		nonDelegateAccount = {
			address: '17676438278047402502L',
			balance: '15412982278208',
			publicKey:
				'dd786687dd2399605ce8fe70212d078db1a2fc6effba127defb176a004cec6d4',
			secondPublicKey: '',
		};
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

	describe('#getAssetBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(
				Buffer.from(validDelegateTransaction.asset.delegate.username, 'utf8'),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true with non conflicting transactions', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validTransaction,
			] as ReadonlyArray<TransactionJSON>);

			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with error when other transaction from same account has the same type', async () => {
			const conflictTransaction = {
				...validTransaction,
				senderPublicKey: validDelegateTransaction.senderPublicKey,
				type: 2,
			};
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				conflictTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(1);
			expect(status).to.equal(Status.FAIL);
		});
	});

	describe('#getRequiredAttributes', () => {
		let attribute: Attributes;

		beforeEach(async () => {
			attribute = validTestTransaction.getRequiredAttributes();
		});

		it('should return attribute including sender address', async () => {
			expect(attribute.account.address).to.include(
				validTestTransaction.senderId,
			);
		});
	});

	describe('#processRequiredState', () => {
		beforeEach(async () => {
			validTestTransaction = new DelegateTransaction(validDelegateTransaction);
		});

		it('should return sender and dependentState.account', async () => {
			const validEntity = {
				account: [sender],
			};
			expect(
				validTestTransaction.processRequiredState(validEntity).sender,
			).to.eql(sender);
			expect(
				validTestTransaction.processRequiredState(validEntity).dependentState,
			)
				.to.have.property('account')
				.and.eql([sender]);
		});

		it('should throw an error when state does not have account key', async () => {
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					{},
				),
			).to.throw('Entity account is required.');
		});

		it('should throw an error when account state does not have address and public key', async () => {
			const invalidEntity = {
				account: [
					{ balance: '0' },
					{
						address: '1L',
						publicKey:
							'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
					},
				],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('Required state does not have valid account type.');
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
	});

	describe('#validateSchema', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.validateSchema();
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with error when asset includes invalid characters', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				asset: {
					delegate: {
						username: '%invalid%username*',
					},
				},
			};
			const transaction = new DelegateTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();

			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should return TransactionResponse with error when asset includes uppercase', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				asset: {
					delegate: {
						username: 'InValIdUsErNAmE',
					},
				},
			};
			const transaction = new DelegateTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should throw TransactionResponse with error when asset is potential address', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				asset: {
					delegate: {
						username: '1L',
					},
				},
			};
			const transaction = new DelegateTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should return TransactionResponse with error when recipientId is not empty', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				recipientId: '1L',
				id: '17277443568874824891',
			};
			const transaction = new DelegateTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();

			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should throw TransactionResponse with error when recipientPublicKey is not empty', async () => {
			const invalidTransaction = {
				...validDelegateTransaction,
				recipientPublicKey: '123',
			};
			const transaction = new DelegateTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.recipientPublicKey');
		});
	});

	describe('#verify', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender: nonDelegateAccount,
			});

			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with error when dependent state includes account', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender,
				dependentState: { account: [sender] },
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.asset.delegate.username');
		});

		it('should return TransactionResponse with error when account is already delegate', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender,
				dependentState: { account: [sender] },
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.asset.delegate.username');
		});
	});

	describe('#apply', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.apply({
				sender: nonDelegateAccount,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with error when dependent state includes account', async () => {
			const { status, errors } = validTestTransaction.apply({
				sender,
				dependentState: { account: [sender] },
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.asset.delegate.username');
		});

		it('should return TransactionResponse with error when account is already delegate', async () => {
			const { status, errors } = validTestTransaction.apply({
				sender,
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.asset.delegate.username');
		});

		it('should throw an error when state does not exist from the base transaction', async () => {
			sandbox.stub(BaseTransaction.prototype, 'apply').returns({});
			expect(
				validTestTransaction.apply.bind(validDelegateTransaction, {
					sender,
				}),
			).to.throw('State is required for applying transaction.');
		});

		it('should return updated account state with added username', async () => {
			const { state } = validTestTransaction.apply({
				sender: nonDelegateAccount,
			});
			expect((state as any).sender.username).to.eql('genesis_10');
		});
	});

	describe('#undo', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.undo({
				sender,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.undo({
				sender: nonDelegateAccount,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should throw an error when state does not exist from the base transaction', async () => {
			sandbox.stub(BaseTransaction.prototype, 'undo').returns({});
			expect(
				validTestTransaction.undo.bind(validDelegateTransaction, {
					sender,
				}),
			).to.throw('State is required for undoing transaction.');
		});

		it('should return updated account state with removed username', async () => {
			const { state } = validTestTransaction.undo({
				sender,
			});
			expect((state as any).sender.username).to.not.exist;
		});
	});
});
