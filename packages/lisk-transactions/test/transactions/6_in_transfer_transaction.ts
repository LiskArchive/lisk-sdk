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
import {
	InTransferTransaction,
	Attributes,
	BaseTransaction,
} from '../../src/transactions';
import { validInTransferTransactions, validTransaction } from '../../fixtures';
import { Status, TransactionJSON } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';

describe('InTransfer transaction class', () => {
	const defaultTransaction = validInTransferTransactions[0];

	let validTestTransaction: InTransferTransaction;

	beforeEach(async () => {
		validTestTransaction = new InTransferTransaction(defaultTransaction);
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

		it('should throw TransactionMultiError when asset is not string', async () => {
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
			).to.throw('Invalid field types');
		});
	});

	describe('#fromJSON', () => {
		beforeEach(async () => {
			sandbox.stub(InTransferTransaction.prototype, 'validateSchema').returns({
				id: validTestTransaction.id,
				status: Status.OK,
				errors: [],
			});
			validTestTransaction = InTransferTransaction.fromJSON(
				validInTransferTransactions[1],
			);
		});

		it('should create instance of InTransferTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(InTransferTransaction);
		});

		it('should call validateSchema', async () => {
			expect(validTestTransaction.validateSchema).to.be.calledOnce;
		});

		it('should throw an error if validateSchema returns error', async () => {
			(InTransferTransaction.prototype.validateSchema as SinonStub).returns({
				status: Status.FAIL,
				errors: [new TransactionError()],
			});
			expect(
				InTransferTransaction.fromJSON.bind(
					undefined,
					validInTransferTransactions[1],
				),
			).to.throw('Failed to validate schema.');
		});
	});

	describe('#getAssetBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).getAssetBytes();
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

	describe('#getRequiredAttributes', () => {
		let attribute: Attributes;

		beforeEach(async () => {
			attribute = validTestTransaction.getRequiredAttributes();
		});

		it('should return attribute including sender address', async () => {
			expect(attribute.account.address).to.include(defaultTransaction.senderId);
		});

		it('should return attribute including dapp id', async () => {
			expect(attribute.transaction.id).to.include(
				defaultTransaction.asset.inTransfer.dappId,
			);
		});
	});

	describe('#processRequiredState', () => {
		it('should return sender, recipient and dependentState.transaction with related dapp transaction', async () => {
			const validEntity = {
				account: [
					{ address: '13155556493249255133L', balance: '10000000000' },
					{ address: '18237045742439723234L', balance: '0' },
				],
				transaction: [
					{
						id: '13227044664082109069',
						type: 5,
						senderId: '18237045742439723234L',
					},
				],
			};
			const {
				sender,
				recipient,
				dependentState,
			} = validTestTransaction.processRequiredState(validEntity);
			expect(sender.address).to.equal('13155556493249255133L');
			expect(recipient).not.to.be.empty;
			expect((recipient as any).address).to.equal('18237045742439723234L');
			expect((dependentState as any).transaction).not.to.be.empty;
			expect((dependentState as any).transaction[0]).to.eql(
				validEntity.transaction[0],
			);
		});

		it('should only return sender', async () => {
			const validEntity = {
				account: [{ address: '13155556493249255133L', balance: '10000000000' }],
				transaction: [],
			};
			const {
				sender,
				recipient,
				dependentState,
			} = validTestTransaction.processRequiredState(validEntity);
			expect(sender.address).to.equal('13155556493249255133L');
			expect(recipient).to.be.undefined;
			expect((dependentState as any).transaction).to.be.empty;
		});

		it('should throw an error when state does not have account key', async () => {
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					{},
				),
			).to.throw('Entity account is required.');
		});

		it('should throw an error when account state does not have address and balance', async () => {
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
						balance: '0',
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

		it('should throw an error when state does not include transaction', async () => {
			const invalidEntity = {
				account: [
					{ address: '13155556493249255133L', balance: '10000000000' },
					{ address: '18237045742439723234L', balance: '0' },
				],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('Entity transaction is required.');
		});

		it('should throw an error when state includes invalid transaction type', async () => {
			const invalidEntity = {
				account: [
					{ address: '13155556493249255133L', balance: '10000000000' },
					{ address: '18237045742439723234L', balance: '0' },
				],
				transaction: [{ id: '13227044664082109069' }],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('Required state does not have valid transaction type.');
		});
	});

	describe('#validateSchema', () => {
		it('should return TransactionResponse with status OK', async () => {
			const { status } = validTestTransaction.validateSchema();
			expect(status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with error when asset includes non id format dappId', async () => {
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
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.inTransfer.dappId');
		});

		it('should return TransactionResponse with error when recipientId is not empty', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				id: '1070575047580588345',
				recipientId: '13155556493249255133L',
			};
			const transaction = new InTransferTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.recipientId');
		});

		it('should return TransactionResponse with error when recipientPublicKey is not empty', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				recipientPublicKey:
					'305b4897abc230c1cc9d0aa3bf0c75747bfa42f32f83f5a92348edea528850ad',
			};
			const transaction = new InTransferTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.recipientPublicKey');
		});

		it('should return TransactionResponse with error when amount is zero', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				id: '16332529042692216279',
				amount: '0',
			};
			const transaction = new InTransferTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.amount');
		});
	});

	describe('#verify', () => {
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

		const defaultValidRecipient = {
			address: '18237045742439723234L',
			balance: '0',
			publicKey:
				'e65b98c217bfcab6d57293056cf4ad78bf45253ab56bc384aff1665cf3611fe9',
		};

		it('should call BaseTransaction verify', async () => {
			sandbox.stub(BaseTransaction.prototype, 'verify').returns({ errors: [] });
			validTestTransaction.verify({
				sender: defaultValidSender,
				dependentState: { transaction: [] },
			});
			expect(BaseTransaction.prototype.verify).to.be.calledOnce;
		});

		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender: defaultValidSender,
				recipient: defaultValidRecipient,
				dependentState: { transaction: defaultValidTxs as any },
			});

			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should throw an error when dependent state does not exist', async () => {
			expect(
				validTestTransaction.verify.bind(validTestTransaction, {
					sender: defaultValidSender,
				}),
			).to.throw('Dependent state is required for inTransfer transaction.');
		});

		it('should throw an error when dependent state does include transaction', async () => {
			expect(
				validTestTransaction.verify.bind(validTestTransaction, {
					sender: defaultValidSender,
					dependentState: {} as any,
				}),
			).to.throw('Entity transaction is required.');
		});

		it('should throw an error when dependent state transaction does not id', async () => {
			expect(
				validTestTransaction.verify.bind(validTestTransaction, {
					sender: defaultValidSender,
					dependentState: {
						transaction: [{ senderId: '123L' }],
					} as any,
				}),
			).to.throw('Required state does not have valid transaction type.');
		});

		it('should throw an error when dependent state transaction does not senderId', async () => {
			expect(
				validTestTransaction.verify.bind(validTestTransaction, {
					sender: defaultValidSender,
					dependentState: {
						transaction: [{ id: '16286924837183274179' }],
					} as any,
				}),
			).to.throw('Required state does not have valid transaction type.');
		});

		it('should return TransactionResponse with error when sender account does not have sufficient balance', async () => {
			const invalidSender = {
				...defaultValidSender,
				balance: '0',
			};
			const { status, errors } = validTestTransaction.verify({
				sender: invalidSender,
				recipient: defaultValidRecipient,
				dependentState: { transaction: defaultValidTxs as any },
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.equal(
				`Account does not have enough LSK: ${invalidSender.address}, balance: ${
					invalidSender.balance
				}`,
			);
		});

		it('should return TransactionResponse with error when the related dapp transaction does not exist', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender: defaultValidSender,
				dependentState: { transaction: [] },
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.equal(
				`Related transaction ${
					validTestTransaction.asset.inTransfer.dappId
				} does not exist.`,
			);
		});

		it('should return TransactionResponse with error when the recipient of the account is not given', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender: defaultValidSender,
				dependentState: { transaction: defaultValidTxs as any },
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.equal(
				`Dapp owner account ${defaultValidTxs[0].senderId} does not exist.`,
			);
		});
	});

	describe('#apply', () => {
		const defaultValidSender = {
			address: '8004805717140184627L',
			balance: '510000000',
			publicKey:
				'305b4897abc230c1cc9d0aa3bf0c75747bfa42f32f83f5a92348edea528850ad',
		};

		const defaultValidRecipient = {
			address: '18237045742439723234L',
			balance: '0',
			publicKey:
				'e65b98c217bfcab6d57293056cf4ad78bf45253ab56bc384aff1665cf3611fe9',
		};

		it('should return TransactionResponse with status OK with updated sender and recipient', async () => {
			const { status, errors } = validTestTransaction.apply({
				sender: defaultValidSender,
				recipient: defaultValidRecipient,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with updated sender and recipient', async () => {
			const { state } = validTestTransaction.apply({
				sender: defaultValidSender,
				recipient: defaultValidRecipient,
			});
			expect(state).not.to.be.empty;
			expect((state as any).sender.balance).to.equal('0');
			expect((state as any).recipient.balance).to.equal('500000000');
		});

		it('should throw an error when recipient is not supplied', async () => {
			expect(
				validTestTransaction.apply.bind(validTransaction, {
					sender: defaultValidSender,
				}),
			).to.throw('Recipient is required.');
		});

		it('should return transaction response with error when sender does not have enough balance', async () => {
			const invalidSender = {
				...defaultValidSender,
				balance: '10000000',
			};
			const { status, errors } = validTestTransaction.apply({
				sender: invalidSender,
				recipient: defaultValidRecipient,
			});
			expect(status).to.be.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.equal(
				`Account does not have enough LSK: ${
					invalidSender.address
				}, balance: 0.1.`,
			);
		});

		it('should return updated account when sender does not have enough balance', async () => {
			const invalidSender = {
				...defaultValidSender,
				balance: '10000000',
			};
			const { state } = validTestTransaction.apply({
				sender: invalidSender,
				recipient: defaultValidRecipient,
			});
			expect((state as any).sender.balance).to.equal('-500000000');
		});
	});

	describe('#undo', () => {
		const defaultValidSender = {
			address: '8004805717140184627L',
			balance: '0',
			publicKey:
				'305b4897abc230c1cc9d0aa3bf0c75747bfa42f32f83f5a92348edea528850ad',
		};

		const defaultValidRecipient = {
			address: '18237045742439723234L',
			balance: '500000000',
			publicKey:
				'e65b98c217bfcab6d57293056cf4ad78bf45253ab56bc384aff1665cf3611fe9',
		};

		it('should return TransactionResponse with status OK with updated sender and recipient', async () => {
			const { status, errors } = validTestTransaction.undo({
				sender: defaultValidSender,
				recipient: defaultValidRecipient,
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should return TransactionResponse with updated sender and recipient', async () => {
			const { state } = validTestTransaction.undo({
				sender: defaultValidSender,
				recipient: defaultValidRecipient,
			});
			expect(state).not.to.be.empty;
			expect((state as any).sender.balance).to.equal('510000000');
			expect((state as any).recipient.balance).to.equal('0');
		});

		it('should throw an error when recipient is not supplied', async () => {
			expect(
				validTestTransaction.undo.bind(validTransaction, {
					sender: defaultValidSender,
				}),
			).to.throw('Recipient is required.');
		});

		it('should return transaction response with error when sender does not have enough balance', async () => {
			const invalidRecipient = {
				...defaultValidRecipient,
				balance: '0',
			};
			const { status, errors } = validTestTransaction.undo({
				sender: defaultValidSender,
				recipient: invalidRecipient,
			});
			expect(status).to.be.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.equal(
				`Account does not have enough LSK: ${
					invalidRecipient.address
				}, balance: 0.`,
			);
		});

		it('should return updated account when sender does not have enough balance', async () => {
			const invalidRecipient = {
				...defaultValidRecipient,
				balance: '0',
			};
			const { state } = validTestTransaction.undo({
				sender: defaultValidSender,
				recipient: invalidRecipient,
			});
			expect((state as any).recipient.balance).to.equal('-500000000');
		});
	});
});
