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
import { OutTransferTransaction, Attributes } from '../../src/transactions';
import { validOutTransferTransactions } from '../../fixtures';
import { Status, TransactionJSON } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';

describe('outTransfer transaction class', () => {
	const defaultTransaction = validOutTransferTransactions[0];

	let validTestTransaction: OutTransferTransaction;

	beforeEach(async () => {
		validTestTransaction = new OutTransferTransaction(defaultTransaction);
	});

	describe('#constructor', () => {
		it('should create instance of OutTransferTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(OutTransferTransaction);
		});

		it('should set the outTransfer asset', async () => {
			expect(validTestTransaction.asset.outTransfer).to.be.an('object');
			expect(validTestTransaction.asset.outTransfer.dappId).to.equal(
				defaultTransaction.asset.outTransfer.dappId,
			);
			expect(validTestTransaction.asset.outTransfer.transactionId).to.equal(
				defaultTransaction.asset.outTransfer.transactionId,
			);
		});

		it('should throw TransactionMultiError when asset.dappId is not string', async () => {
			const invalidOutTransferTransactionData = {
				...defaultTransaction,
				asset: {
					outTransfer: {
						dappId: 1,
						transactionId: '1',
					},
				},
			};
			expect(
				() => new OutTransferTransaction(invalidOutTransferTransactionData),
			).to.throw('Invalid field types');
		});

		it('should throw TransactionMultiError when asset.transactionId is not string', async () => {
			const invalidOutTransferTransactionData = {
				...defaultTransaction,
				asset: {
					outTransfer: {
						dappId: '1',
						transactionId: 1,
					},
				},
			};
			expect(
				() => new OutTransferTransaction(invalidOutTransferTransactionData),
			).to.throw('Invalid field types');
		});
	});

	describe('#fromJSON', () => {
		beforeEach(async () => {
			sandbox.stub(OutTransferTransaction.prototype, 'validateSchema').returns({
				id: validTestTransaction.id,
				status: Status.OK,
				errors: [],
			});
			validTestTransaction = OutTransferTransaction.fromJSON(
				validOutTransferTransactions[1],
			);
		});

		it('should create instance of OutTransferTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(OutTransferTransaction);
		});

		it('should call validateSchema', async () => {
			expect(validTestTransaction.validateSchema).to.be.calledOnce;
		});

		it('should throw an error if validateSchema returns error', async () => {
			(OutTransferTransaction.prototype.validateSchema as SinonStub).returns({
				status: Status.FAIL,
				errors: [new TransactionError()],
			});
			expect(
				OutTransferTransaction.fromJSON.bind(
					undefined,
					validOutTransferTransactions[1],
				),
			).to.throw('Failed to validate schema.');
		});
	});

	describe('#getAssetBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(
				Buffer.concat([
					Buffer.from(defaultTransaction.asset.outTransfer.dappId, 'utf8'),
					Buffer.from(
						defaultTransaction.asset.outTransfer.transactionId,
						'utf8',
					),
				]),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validOutTransferTransactions[1],
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with errors when it has conflicting asset transaction id', async () => {
			const invalidTransaction = {
				...validOutTransferTransactions[1],
				asset: {
					outTransfer: {
						dappId: validOutTransferTransactions[1].asset.outTransfer.dappId,
						transactionId: defaultTransaction.asset.outTransfer.transactionId,
					},
				},
			};
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				invalidTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(status).to.equal(Status.FAIL);
			expect(errors)
				.to.be.an('array')
				.of.length(1);
			expect(errors[0].dataPath).to.equal('.asset.outTransfer.transactionId');
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
				defaultTransaction.asset.outTransfer.dappId,
			);
		});

		it('should return attribute including outTransactionId', async () => {
			expect(attribute.transaction.outTransactionId).to.include(
				defaultTransaction.asset.outTransfer.transactionId,
			);
		});
	});

	describe('#processRequiredState', () => {
		it('should return sender, recipient and dependentState.transaction with related dapp transaction', async () => {
			const validEntity = {
				account: [{ address: '18237045742439723234L', balance: '10000000000' }],
				transaction: [
					{
						id: '16337394785118081960',
						type: 5,
					},
					{
						id: '12345678909876543213',
						type: 6,
					},
				],
			};
			const {
				sender,
				recipient,
				dependentState,
			} = validTestTransaction.processRequiredState(validEntity);
			expect(sender.address).to.equal('18237045742439723234L');
			expect(recipient).not.to.be.empty;
			expect((recipient as any).address).to.equal('18237045742439723234L');
			expect((dependentState as any).transaction)
				.to.be.an('array')
				.and.lengthOf(2);
			expect(
				(dependentState as any).transaction.map((tx: any) => tx.id),
			).to.eql(['16337394785118081960', '12345678909876543213']);
		});

		it('should only return sender and recipient', async () => {
			const validEntity = {
				account: [{ address: '18237045742439723234L', balance: '10000000000' }],
				transaction: [],
			};
			const {
				sender,
				recipient,
				dependentState,
			} = validTestTransaction.processRequiredState(validEntity);
			expect(sender.address).to.equal('18237045742439723234L');
			expect((recipient as any).address).to.equal('18237045742439723234L');
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
				transaction: [],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('No sender account is found.');
		});

		it('should throw an error when account state does not include the recipient', async () => {
			validTestTransaction = new OutTransferTransaction({
				...defaultTransaction,
				recipientId: '13155556493249255133L',
			});
			const invalidEntity = {
				account: [{ address: '18237045742439723234L', balance: '10000000000' }],
				transaction: [],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('No recipient account is found.');
		});

		it('should throw an error when state does not include transaction', async () => {
			const invalidEntity = {
				account: [{ address: '18237045742439723234L', balance: '10000000000' }],
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
				id: '16003217217288827597',
				asset: {
					outTransfer: {
						dappId: 'id-not-id-format-zzzzz',
						transactionId: '17748758437863626387',
					},
				},
			};
			const transaction = new OutTransferTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.outTransfer.dappId');
		});

		it('should return TransactionResponse with error when asset includes non id format transaction id', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				id: '14791901133590540608',
				asset: {
					outTransfer: {
						dappId: '17748758437863626387',
						transactionId: 'id-not-id-format-zzzzz',
					},
				},
			};
			const transaction = new OutTransferTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.outTransfer.transactionId');
		});

		it('should return TransactionResponse with error when recipientId is empty', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				recipientId: '',
				id: '13921832040819226757',
			};
			const transaction = new OutTransferTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.recipientId');
		});

		it('should return TransactionResponse with error when amount is zero', async () => {
			const invalidTransaction = {
				...defaultTransaction,
				id: '16972514353304288599',
				amount: '0',
			};
			const transaction = new OutTransferTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.equal('.amount');
		});
	});

	describe('#verify', () => {
		const defaultValidSender = {
			address: '8004805717140184627L',
			balance: '1000000000',
			publicKey:
				'305b4897abc230c1cc9d0aa3bf0c75747bfa42f32f83f5a92348edea528850ad',
		};

		const defaultValidTxs = [
			{
				id: '16337394785118081960',
				type: 5,
				asset: {
					dapp: {},
				},
			},
			{
				id: '12345678909876543213',
				type: 6,
				asset: {},
			},
		];

		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender: defaultValidSender,
				recipient: defaultValidSender,
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
			).to.throw('Dependent state is required for outTransfer transaction.');
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

		it('should throw an error when dependent state transaction does not include type', async () => {
			expect(
				validTestTransaction.verify.bind(validTestTransaction, {
					sender: defaultValidSender,
					dependentState: {
						transaction: [{ id: '16286924837183274179' }],
					} as any,
				}),
			).to.throw('Required state does not have valid transaction type.');
		});

		it('should throw an error when dependent state transaction does not include asset', async () => {
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
				recipient: defaultValidSender,
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
				`Related Dapp ${
					validTestTransaction.asset.outTransfer.dappId
				} not found.`,
			);
		});

		it('should return TransactionResponse with error when the related transactions exist', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender: defaultValidSender,
				dependentState: {
					transaction: [
						{ id: '13227044664082109069', type: 6, asset: {} } as any,
					],
				},
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.equal(
				`Related Dapp ${
					validTestTransaction.asset.outTransfer.dappId
				} not found.`,
			);
		});
	});

	describe('#apply', () => {
		const defaultValidSender = {
			address: '18237045742439723234L',
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
			expect((state as any).sender.balance).to.equal('400000000');
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
			expect((state as any).sender.balance).to.equal('-100000000');
		});
	});

	describe('#undo', () => {
		const defaultValidSender = {
			address: '18237045742439723234L',
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
			expect((state as any).sender.balance).to.equal('110000000');
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
			expect((state as any).recipient.balance).to.equal('-100000000');
		});
	});
});
