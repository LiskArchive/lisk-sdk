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
 */

'use strict';

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const transactionHandlers = require('../../../../../../src/modules/chain/transactions/transactions_handlers');
const votesWeightHandler = require('../../../../../../src/modules/chain/transactions/votes_weight');
const exceptionHandlers = require('../../../../../../src/modules/chain/transactions/exceptions_handlers');
const StateStore = require('../../../../../../src/modules/chain/state_store');
const {
	Transaction: transactionFixture,
} = require('../../../../fixtures/transactions');
const { Account: accountFixture } = require('../../../../fixtures/accounts');

// TODO: re-implement for new transaction processing
describe('transactions', () => {
	afterEach(() => sinonSandbox.restore());

	const trs1 = transactionFixture();
	const trs2 = transactionFixture();

	const dummyState = {
		version: 1,
		height: 1,
		timestamp: 'aTimestamp',
	};

	let storageMock;
	let stateStoreMock;

	beforeEach(async () => {
		// Add matcher to transactions
		trs1.matcher = () => true;
		trs2.matcher = () => true;

		// Add prepare steps to transactions
		trs1.prepare = sinonSandbox.stub();
		trs2.prepare = sinonSandbox.stub();

		// Add apply steps to transactions
		trs1.apply = sinonSandbox.stub();
		trs2.apply = sinonSandbox.stub();

		// Add undo steps to transactions
		trs1.undo = sinonSandbox.stub();
		trs2.undo = sinonSandbox.stub();

		stateStoreMock = sinonSandbox.stub();

		storageMock = {
			entities: {
				Transaction: {
					get: sinonSandbox.stub(),
				},
				Account: {
					get: sinonSandbox.stub().returns([]),
				},
			},
		};

		sinonSandbox.stub(StateStore.prototype, 'createSnapshot');
		sinonSandbox.stub(StateStore.prototype, 'restoreSnapshot');
		StateStore.prototype.transaction = {
			add: sinonSandbox.stub(),
		};
		StateStore.prototype.account = {
			get: sinonSandbox.stub(),
			createSnapshot: sinonSandbox.stub(),
			restoreSnapshot: sinonSandbox.stub(),
		};
	});

	describe('#checkAllowedTransactions', () => {
		it('should return a proper response format', async () => {
			// Act
			const response = transactionHandlers.checkAllowedTransactions(dummyState)(
				[trs1],
			);

			// Assert
			expect(response).to.have.deep.property('transactionsResponses', [
				{
					id: trs1.id,
					status: 1,
					errors: [],
				},
			]);
		});

		it('in case of non allowed transactions, it should return responses with TransactionStatus.FAIL and proper error message', async () => {
			// Arrange
			const disallowedTransaction = {
				...trs1,
				matcher: () => false,
			};

			// Act
			const response = transactionHandlers.checkAllowedTransactions(dummyState)(
				[disallowedTransaction],
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				disallowedTransaction.id,
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.FAIL,
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(1);
			expect(response.transactionsResponses[0].errors[0]).to.be.instanceOf(
				Error,
			);
			expect(response.transactionsResponses[0].errors[0].message).to.equal(
				`Transaction type ${
					disallowedTransaction.type
				} is currently not allowed.`,
			);
		});

		it('should report a transaction as allowed if it does not implement matcher', async () => {
			// Arrange
			const { matcher, ...transactionWithoutMatcherImpl } = trs1;

			// Act
			const response = transactionHandlers.checkAllowedTransactions(dummyState)(
				[transactionWithoutMatcherImpl],
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				transactionWithoutMatcherImpl.id,
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK,
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);
		});

		it('in case of allowed transactions, it should return responses with TransactionStatus.OK and no errors', async () => {
			// Arrange
			const allowedTransaction = {
				...trs1,
				matcher: () => true,
			};

			// Act
			const response = transactionHandlers.checkAllowedTransactions(dummyState)(
				[allowedTransaction],
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				allowedTransaction.id,
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK,
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);
		});

		it('should return a mix of responses including allowed and disallowed transactions', async () => {
			// Arrange
			const testTransactions = [
				trs1, // Allowed
				{
					...trs1,
					matcher: () => false, // Disallowed
				},
			];

			// Act
			const response = transactionHandlers.checkAllowedTransactions(dummyState)(
				testTransactions,
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(2);
			// Allowed transaction formatted response check
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				testTransactions[0].id,
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK,
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);

			// Allowed transaction formatted response check
			expect(response.transactionsResponses[1]).to.have.property(
				'id',
				testTransactions[1].id,
			);
			expect(response.transactionsResponses[1]).to.have.property(
				'status',
				TransactionStatus.FAIL,
			);
			expect(response.transactionsResponses[1].errors.length).to.equal(1);
			expect(response.transactionsResponses[1].errors[0]).to.be.instanceOf(
				Error,
			);
			expect(response.transactionsResponses[1].errors[0].message).to.equal(
				`Transaction type ${
					testTransactions[1].type
				} is currently not allowed.`,
			);
		});
	});

	describe('#validateTransactions', () => {
		const validResponse = { status: TransactionStatus.OK, id: trs1.id };
		const invalidResponse = { status: TransactionStatus.FAIL, id: trs2.id };

		beforeEach(async () => {
			trs1.validate = sinonSandbox.stub().returns(validResponse);
			trs2.validate = sinonSandbox.stub().returns(invalidResponse);
		});

		it('should invoke validate() on each transaction', async () => {
			transactionHandlers.validateTransactions()([trs1, trs2]);

			expect(trs1.validate).to.be.calledOnce;
			expect(trs2.validate).to.be.calledOnce;
		});

		it('should update responses for exceptions for invalid responses', async () => {
			sinonSandbox.stub(
				exceptionHandlers,
				'updateTransactionResponseForExceptionTransactions',
			);
			transactionHandlers.validateTransactions()([trs1, trs2]);

			expect(
				exceptionHandlers.updateTransactionResponseForExceptionTransactions,
			).to.be.calledOnce;
			expect(
				exceptionHandlers.updateTransactionResponseForExceptionTransactions,
			).to.be.calledWithExactly([invalidResponse], [trs1, trs2], undefined);
		});

		it('should return transaction responses', async () => {
			const result = transactionHandlers.validateTransactions()([trs1, trs2]);

			expect(result).to.be.eql({
				transactionsResponses: [validResponse, invalidResponse],
			});
		});
	});

	describe('#checkPersistedTransactions', () => {
		it('should resolve in empty response if called with empty array', async () => {
			const result = await transactionHandlers.checkPersistedTransactions(
				storageMock,
			)([]);

			expect(result).to.be.eql({ transactionsResponses: [] });
		});

		it('should invoke entities.Transaction to check persistence of transactions', async () => {
			storageMock.entities.Transaction.get.resolves([trs1, trs2]);

			await transactionHandlers.checkPersistedTransactions(storageMock)([
				trs1,
				trs2,
			]);

			expect(storageMock.entities.Transaction.get).to.be.calledOnce;
			expect(storageMock.entities.Transaction.get).to.be.calledWithExactly({
				id_in: [trs1.id, trs2.id],
			});
		});

		it('should return TransactionStatus.OK for non-persisted transactions', async () => {
			// Treat trs1 as persisted transaction
			storageMock.entities.Transaction.get.resolves([trs1]);

			const result = await transactionHandlers.checkPersistedTransactions(
				storageMock,
			)([trs1, trs2]);

			const transactionResponse = result.transactionsResponses.find(
				({ id }) => id === trs2.id,
			);

			expect(transactionResponse.status).to.be.eql(TransactionStatus.OK);
			expect(transactionResponse.errors).to.be.eql([]);
		});

		it('should return TransactionStatus.FAIL for persisted transactions', async () => {
			// Treat trs1 as persisted transaction
			storageMock.entities.Transaction.get.resolves([trs1]);

			const result = await transactionHandlers.checkPersistedTransactions(
				storageMock,
			)([trs1, trs2]);

			const transactionResponse = result.transactionsResponses.find(
				({ id }) => id === trs1.id,
			);

			expect(transactionResponse.status).to.be.eql(TransactionStatus.FAIL);
			expect(transactionResponse.errors).have.lengthOf(1);
			expect(transactionResponse.errors[0].message).to.be.eql(
				`Transaction is already confirmed: ${trs1.id}`,
			);
		});
	});

	describe('#applyGenesisTransactions', () => {
		const trs1Response = {
			status: TransactionStatus.OK,
			id: trs1.id,
		};
		const trs2Response = {
			status: TransactionStatus.OK,
			id: trs2.id,
		};

		beforeEach(async () => {
			trs1.apply.returns(trs1Response);
			trs2.apply.returns(trs2Response);
			sinonSandbox.stub(votesWeightHandler, 'prepare');
			sinonSandbox.stub(votesWeightHandler, 'apply');
		});

		it('should prepare all transactions', async () => {
			await transactionHandlers.applyGenesisTransactions(storageMock)([
				trs1,
				trs2,
			]);

			expect(trs1.prepare).to.be.calledOnce;
			expect(trs2.prepare).to.be.calledOnce;
		});

		it('should apply all transactions', async () => {
			await transactionHandlers.applyGenesisTransactions(storageMock)([
				trs1,
				trs2,
			]);

			expect(trs1.apply).to.be.calledOnce;
			expect(trs2.apply).to.be.calledOnce;
		});

		it('should call transaction to vote.apply', async () => {
			await transactionHandlers.applyGenesisTransactions(storageMock)([
				trs1,
				trs2,
			]);

			expect(votesWeightHandler.apply).to.be.calledTwice;
		});

		it('should add transaction to state store', async () => {
			const { stateStore } = await transactionHandlers.applyGenesisTransactions(
				storageMock,
			)([trs1, trs2]);

			expect(stateStore.transaction.data.length).to.equal(2);
			expect(stateStore.transaction.data[0]).to.be.eql(trs1);
			expect(stateStore.transaction.data[1]).to.be.eql(trs2);
		});

		it('should override the status of transaction to TransactionStatus.OK', async () => {
			trs1.apply.returns({
				status: TransactionStatus.FAIL,
				id: trs1.id,
			});

			const result = await transactionHandlers.applyGenesisTransactions(
				storageMock,
			)([trs1]);

			expect(result.transactionsResponses[0].status).to.be.eql(
				TransactionStatus.OK,
			);
		});

		it('should return transaction responses and state store', async () => {
			const result = await transactionHandlers.applyGenesisTransactions(
				storageMock,
			)([trs1, trs2]);

			// expect(result.stateStore).to.be.eql(stateStoreMock);
			expect(result.transactionsResponses).to.be.eql([
				trs1Response,
				trs2Response,
			]);
		});
	});

	// TODO: Fix the source code to make the tests easy to test.
	// It is impossible to fix these tests because private variables defined in modules are
	// impossile to mock. applyTransactions uses verifyTotalSpending func which
	// internally uses an instance of StateStore which is impossible to mock. Making it difficult
	// to properly test this function.
	// This issue will e resolved in a separate issue: #3987
	// eslint-disable-next-line mocha/no-skipped-tests
	describe.skip('#applyTransactions', () => {
		const tx = {};

		let trs1Response;
		let trs2Response;
		let updateTransactionResponseForExceptionTransactionsStub;

		beforeEach(async () => {
			trs1Response = {
				status: TransactionStatus.OK,
				id: trs1.id,
			};
			trs2Response = {
				status: TransactionStatus.OK,
				id: trs2.id,
			};

			trs1.apply.returns(trs1Response);
			trs2.apply.returns(trs2Response);

			sinonSandbox.stub(votesWeightHandler, 'prepare');
			sinonSandbox.stub(votesWeightHandler, 'apply');
			sinonSandbox
				.stub(transactionHandlers, 'verifyTotalSpending')
				.returns([trs1Response, trs2Response]);

			sinonSandbox.stub(
				exceptionHandlers,
				'updateTransactionResponseForExceptionTransactions',
			);
		});

		it('should initialize the state store', async () => {
			await transactionHandlers.applyTransactions(storageMock)(
				[trs1, trs2],
				tx,
			);

			// expect(StateStoreStub).to.be.calledOnce;
			// expect(StateStoreStub).to.be.calledWithExactly(storageMock, {
			// 	mutate: true,
			// 	tx,
			// });
		});

		it('should prepare all transactions', async () => {
			await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

			expect(trs1.prepare).to.be.calledOnce;
			expect(trs2.prepare).to.be.calledOnce;
		});

		it('should verify total spending', async () => {
			await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

			expect(transactionHandlers.verifyTotalSpending).to.be.calledOnce;
			expect(transactionHandlers.verifyTotalSpending).to.be.calledWithExactly(
				[trs1, trs2],
				stateStoreMock,
			);
		});

		it('should return transaction responses and state store', async () => {
			const result = await transactionHandlers.applyTransactions(storageMock)([
				trs1,
				trs2,
			]);

			expect(result.stateStore).to.be.eql(stateStoreMock);
			expect(result.transactionsResponses).to.be.eql([
				trs1Response,
				trs2Response,
			]);
		});

		describe('for every transaction which passes verify total spending step', () => {
			beforeEach(async () => {
				// Only trs1 passes verifyTotalSpending and trs2 failed
				transactionHandlers.verifyTotalSpending.returns([trs2Response]);
			});

			it('should create snapshot before apply', async () => {
				await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

				expect(stateStoreMock.account.createSnapshot).to.be.calledOnce;
			});

			it('should apply transaction', async () => {
				await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

				expect(trs2.apply).to.not.be.called;
				expect(trs1.apply).to.be.calledOnce;
				expect(trs1.apply).to.be.calledWithExactly(stateStoreMock);
			});

			it('should update response for exceptions if response is not OK', async () => {
				trs1Response.status = TransactionStatus.FAIL;
				trs1.apply.returns(trs1Response);

				await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

				expect(updateTransactionResponseForExceptionTransactionsStub).to.be
					.calledOnce;
				expect(
					updateTransactionResponseForExceptionTransactionsStub,
				).to.be.calledWithExactly([trs1Response], [trs1]);
			});

			it('should not update response for exceptions if response is OK', async () => {
				trs1Response.status = TransactionStatus.OK;
				trs1.apply.returns(trs1Response);

				await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

				expect(updateTransactionResponseForExceptionTransactionsStub).to.not.be
					.called;
			});

			it('should add to roundInformation if transaction response is OK', async () => {
				await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

				expect(votesWeightHandler.apply).to.be.calledOnce;
			});

			it('should not add to roundInformation if transaction response is not OK', async () => {
				trs1Response.status = TransactionStatus.FAIL;
				trs1.apply.returns(trs1Response);

				await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

				expect(votesWeightHandler.apply).to.not.be.called;
			});

			it('should add to state store if transaction response is OK', async () => {
				await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

				expect(stateStoreMock.transaction.add).to.be.calledOnce;
				expect(stateStoreMock.transaction.add).to.be.calledWithExactly(trs1);
			});

			it('should not add to state store if transaction response is not OK', async () => {
				trs1Response.status = TransactionStatus.FAIL;
				trs1.apply.returns(trs1Response);

				await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

				expect(stateStoreMock.transaction.add).to.not.be.called;
			});

			it('should not restore snapshot if transaction response is Ok', async () => {
				await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

				expect(stateStoreMock.account.restoreSnapshot).to.not.be.called;
			});

			it('should restore snapshot if transaction response is not Ok', async () => {
				trs1Response.status = TransactionStatus.FAIL;
				trs1.apply.returns(trs1Response);

				await transactionHandlers.applyTransactions(storageMock)([trs1, trs2]);

				expect(stateStoreMock.account.restoreSnapshot).to.be.calledOnce;
			});
		});
	});

	describe('#undoTransactions', () => {
		const tx = {};
		let trs1Response;
		let trs2Response;

		beforeEach(async () => {
			trs1Response = {
				status: TransactionStatus.OK,
				id: trs1.id,
			};
			trs2Response = {
				status: TransactionStatus.OK,
				id: trs2.id,
			};

			trs1.undo.returns(trs1Response);
			trs2.undo.returns(trs2Response);

			sinonSandbox.stub(votesWeightHandler, 'undo');
			sinonSandbox.stub(
				exceptionHandlers,
				'updateTransactionResponseForExceptionTransactions',
			);
		});

		it('should initialize the state store', async () => {
			await transactionHandlers.undoTransactions(storageMock)([trs1, trs2], tx);

			// expect(StateStoreStub).to.be.calledOnce;
			// expect(StateStoreStub).to.be.calledWithExactly(storageMock, {
			// 	mutate: true,
			// 	tx,
			// });
		});

		it('should prepare all transactions', async () => {
			await transactionHandlers.undoTransactions(storageMock)([trs1, trs2]);

			expect(trs1.prepare).to.be.calledOnce;
			expect(trs2.prepare).to.be.calledOnce;
		});

		it('should undo for every transaction', async () => {
			await transactionHandlers.undoTransactions(storageMock)([trs1, trs2]);

			expect(trs1.undo).to.be.calledOnce;
			expect(trs2.undo).to.be.calledOnce;
		});

		it('should undo round information for every transaction', async () => {
			await transactionHandlers.undoTransactions(storageMock)([trs1, trs2]);

			expect(votesWeightHandler.undo).to.be.calledTwice;
		});

		it('should update exceptions for responses which are not OK', async () => {
			trs1Response.status = TransactionStatus.FAIL;
			trs1.undo.returns(trs1Response);

			await transactionHandlers.undoTransactions(storageMock)([trs1, trs2]);

			expect(
				exceptionHandlers.updateTransactionResponseForExceptionTransactions,
			).to.be.calledOnce;
			// expect(
			// 	exceptionHandlers.updateTransactionResponseForExceptionTransactions
			// ).to.be.calledWithExactly([trs1Response], [trs1, trs2]);
		});

		it('should return transaction responses and state store', async () => {
			const result = await transactionHandlers.undoTransactions(storageMock)([
				trs1,
				trs2,
			]);

			// expect(result.stateStore).to.be.eql(stateStoreMock);
			expect(result.transactionsResponses).to.be.eql([
				trs1Response,
				trs2Response,
			]);
		});
	});

	describe('#verifyTransactions', () => {
		let trs1Response;
		let trs2Response;
		let slotsMock;

		beforeEach(async () => {
			trs1Response = {
				status: TransactionStatus.OK,
				id: trs1.id,
				errors: [],
			};
			trs2Response = {
				status: TransactionStatus.OK,
				id: trs2.id,
				errors: [],
			};

			trs1.apply.returns(trs1Response);
			trs2.apply.returns(trs2Response);

			slotsMock = {
				getSlotNumber: sinonSandbox.stub(),
			};

			sinonSandbox.stub(
				exceptionHandlers,
				'updateTransactionResponseForExceptionTransactions',
			);
		});

		it('should initialize the state store', async () => {
			await transactionHandlers.verifyTransactions(storageMock, slotsMock)([
				trs1,
				trs2,
			]);

			// expect(StateStoreStub).to.be.calledOnce;
			// expect(StateStoreStub).to.be.calledWithExactly(storageMock, {
			// 	mutate: false,
			// });
		});

		it('should prepare all transactions', async () => {
			await transactionHandlers.verifyTransactions(storageMock, slotsMock)([
				trs1,
				trs2,
			]);

			expect(trs1.prepare).to.be.calledOnce;
			expect(trs2.prepare).to.be.calledOnce;
		});

		it('should create snapshot for every transaction', async () => {
			await transactionHandlers.verifyTransactions(storageMock, slotsMock)([
				trs1,
				trs2,
			]);

			expect(StateStore.prototype.createSnapshot).to.be.calledTwice;
		});

		it('should apply all transaction', async () => {
			await transactionHandlers.verifyTransactions(storageMock, slotsMock)([
				trs1,
				trs2,
			]);

			expect(trs1.apply).to.be.calledOnce;
			expect(trs2.apply).to.be.calledOnce;
		});

		it('should override response if transaction is in future', async () => {
			// const futureDate = new Date() + 3600;
			slotsMock.getSlotNumber.withArgs(10).returns(10);
			slotsMock.getSlotNumber.returns(5);
			trs1.timestamp = 10;

			const result = await transactionHandlers.verifyTransactions(
				storageMock,
				slotsMock,
			)([trs1]);

			expect(result.transactionsResponses).to.lengthOf(1);
			expect(result.transactionsResponses[0].status).to.be.eql(
				TransactionStatus.FAIL,
			);
			expect(result.transactionsResponses[0].errors[0].message).to.be.eql(
				'Invalid transaction timestamp. Timestamp is in the future',
			);
		});

		it('should restore snapshot for every transaction', async () => {
			await transactionHandlers.verifyTransactions(storageMock, slotsMock)([
				trs1,
				trs2,
			]);

			expect(StateStore.prototype.restoreSnapshot).to.be.calledTwice;
		});

		it('should update response for exceptions if response is not OK', async () => {
			trs1Response.status = TransactionStatus.FAIL;
			trs1.apply.returns(trs1Response);

			await transactionHandlers.verifyTransactions(storageMock, slotsMock)([
				trs1,
				trs2,
			]);

			expect(
				exceptionHandlers.updateTransactionResponseForExceptionTransactions,
			).to.be.calledOnce;
			expect(
				exceptionHandlers.updateTransactionResponseForExceptionTransactions,
			).to.be.calledWithExactly([trs1Response], [trs1, trs2], undefined);
		});

		it('should return transaction responses', async () => {
			const result = await transactionHandlers.verifyTransactions(
				storageMock,
				slotsMock,
			)([trs1, trs2]);

			expect(result.transactionsResponses).to.be.eql([
				trs1Response,
				trs2Response,
			]);
		});
	});

	describe('#processSignature', () => {
		const signature = '12356677';
		let addMultisignatureStub;

		beforeEach(async () => {
			addMultisignatureStub = sinonSandbox.stub();

			trs1.addMultisignature = addMultisignatureStub;
		});

		it('should prepare transaction', async () => {
			await transactionHandlers.processSignature(storageMock)(trs1, signature);

			expect(trs1.prepare).to.be.calledOnce;
		});

		it('should add signature to transaction', async () => {
			await transactionHandlers.processSignature(storageMock)(trs1, signature);

			expect(addMultisignatureStub).to.be.calledOnce;
		});
	});

	describe('#verifyTotalSpending', () => {
		beforeEach(async () => {
			stateStoreMock = {
				createSnapshot: sinonSandbox.stub(),
				restoreSnapshot: sinonSandbox.stub(),
				transaction: {
					add: sinonSandbox.stub(),
				},
				account: {
					get: sinonSandbox.stub(),
					createSnapshot: sinonSandbox.stub(),
					restoreSnapshot: sinonSandbox.stub(),
				},
			};
		});

		it('should not perform any check if there is only one transaction per sender', async () => {
			const account1 = accountFixture();
			const account2 = accountFixture();
			trs1.senderId = account1.address;
			trs2.senderId = account2.address;

			const result = transactionHandlers.verifyTotalSpending(
				[trs1, trs2],
				stateStoreMock,
			);

			expect(result).to.be.eql([]);
		});

		it('should return error response if total spending is more than account balance', async () => {
			const accountBalance = '6';

			const account = accountFixture({ balance: accountBalance });
			stateStoreMock.account.get.withArgs(account.address).returns(account);

			const validTransaction = transactionFixture();
			validTransaction.senderId = account.address;
			validTransaction.amount = '3';
			validTransaction.fee = '2';

			const inValidTransaction1 = transactionFixture();
			inValidTransaction1.senderId = account.address;
			inValidTransaction1.amount = '3';
			inValidTransaction1.fee = '2';

			const inValidTransaction2 = transactionFixture();
			inValidTransaction2.senderId = account.address;
			inValidTransaction2.amount = '1';
			inValidTransaction2.fee = '1';

			// First transaction is valid, while second and third exceed the balance
			const transactions = [
				validTransaction, //   Valid: Spend 5 while balance is 6
				inValidTransaction1, // Invalid: Spend 5 + 5 = 10 while balance is 6
				inValidTransaction2, // Invalid: Spend 5 + 2 = 7 while balance is 6
			];

			const result = transactionHandlers.verifyTotalSpending(
				transactions,
				stateStoreMock,
			);

			expect(result).to.be.lengthOf(2);

			expect(result[0].id).to.be.eql(inValidTransaction1.id);
			expect(result[0].status).to.be.eql(TransactionStatus.FAIL);
			expect(result[0].errors[0].message).to.be.eql(
				`Account does not have enough LSK for total spending. balance: ${accountBalance}, spending: 10`,
			);

			expect(result[1].id).to.be.eql(inValidTransaction2.id);
			expect(result[1].status).to.be.eql(TransactionStatus.FAIL);
			expect(result[1].errors[0].message).to.be.eql(
				`Account does not have enough LSK for total spending. balance: ${accountBalance}, spending: 7`,
			);
		});

		it('should not return error response if total spending equal to account balance', async () => {
			const accountBalance = '8';

			const account = accountFixture({ balance: accountBalance });
			stateStoreMock.account.get.withArgs(account.address).returns(account);

			const validTransaction1 = transactionFixture();
			validTransaction1.senderId = account.address;
			validTransaction1.amount = '2';
			validTransaction1.fee = '2';

			const validTransaction2 = transactionFixture();
			validTransaction2.senderId = account.address;
			validTransaction2.amount = '2';
			validTransaction2.fee = '2';

			const transactions = [
				validTransaction1, // Valid: Spend 4 while balance 8
				validTransaction2, // Valid: Spend 4 + 4 while balance 8
			];
			const result = transactionHandlers.verifyTotalSpending(
				transactions,
				stateStoreMock,
			);

			expect(result).to.be.eql([]);
		});

		it('should not return error response if total spending is less than account balance', async () => {
			const accountBalance = '10';

			const account = accountFixture({ balance: accountBalance });
			stateStoreMock.account.get.withArgs(account.address).returns(account);

			const validTransaction1 = transactionFixture();
			validTransaction1.senderId = account.address;
			validTransaction1.amount = '2';
			validTransaction1.fee = '2';

			const validTransaction2 = transactionFixture();
			validTransaction2.senderId = account.address;
			validTransaction2.amount = '2';
			validTransaction2.fee = '2';

			const transactions = [
				validTransaction1, // Valid: Spend 4 while balance 10
				validTransaction2, // Valid: Spend 4 + 4 while balance 10
			];
			const result = transactionHandlers.verifyTotalSpending(
				transactions,
				stateStoreMock,
			);

			expect(result).to.be.eql([]);
		});
	});
});
