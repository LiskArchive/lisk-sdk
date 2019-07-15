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
 */

'use strict';

const rewire = require('rewire');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');

const {
	Transaction: transactionFixture,
} = require('../../../../fixtures/transactions');

const ProcessTransactions = rewire(
	'../../../../../../src/modules/chain/submodules/process_transactions'
);

describe('ProcessTransactions', () => {
	let processTransactions;

	const trs1 = transactionFixture();

	const trs2 = transactionFixture();

	const dummyState = {
		version: 1,
		height: 1,
		timestamp: 'aTimestamp',
	};

	const storageMock = {
		entities: {
			Transaction: {
				get: sinonSandbox.stub(),
			},
		},
	};

	const stateStoreMock = {
		transaction: {
			add: sinonSandbox.stub(),
		},
	};
	const StateStoreStub = sinonSandbox.stub().returns(stateStoreMock);

	const roundInformationMock = {
		apply: sinonSandbox.stub(),
	};

	const paramScope = {
		components: {
			storage: storageMock,
		},
		modules: {
			blocks: {
				lastBlock: {
					get: sinonSandbox.stub().returns(dummyState),
				},
			},
		},
	};

	beforeEach(done => {
		// Act
		processTransactions = new ProcessTransactions(() => {
			processTransactions.onBind(paramScope);

			// Add matcher to transactions
			trs1.matcher = () => true;
			trs2.matcher = () => true;

			// Add prepare steps to transactions
			trs1.prepare = sinonSandbox.stub();
			trs2.prepare = sinonSandbox.stub();

			// Add apply steps to transactions
			trs1.apply = sinonSandbox.stub().returns({
				status: TransactionStatus.OK,
				id: trs1.id,
			});
			trs2.apply = sinonSandbox.stub().returns({
				status: TransactionStatus.OK,
				id: trs2.id,
			});

			ProcessTransactions.__set__('StateStore', StateStoreStub);
			ProcessTransactions.__set__('roundInformation', roundInformationMock);

			done();
		}, paramScope);
	});

	afterEach(async () => {
		sinonSandbox.restore();
		sinonSandbox.reset();

		roundInformationMock.apply.reset();
		stateStoreMock.transaction.add.reset();
	});

	describe('constructor()', () => {
		it('should create instance of module', async () => {
			expect(processTransactions).to.be.instanceOf(ProcessTransactions);
		});

		it('should assign parameters correctly', async () => {
			const library = ProcessTransactions.__get__('library');

			expect(library.storage).to.be.eql(paramScope.components.storage);
		});

		it('should invoke the callback', done => {
			const cb = (error, object) => {
				expect(error).to.be.null;
				expect(object).to.be.instanceOf(ProcessTransactions);
				done();
			};
			new ProcessTransactions(cb, paramScope);
		});
	});

	describe('onBind()', () => {
		it('should assign params correctly to library', async () => {
			const library = ProcessTransactions.__get__('library');

			expect(library.modules.blocks).to.be.eql(paramScope.modules.blocks);
		});
	});

	describe('validateTransactions()', () => {
		const validResponse = { status: TransactionStatus.OK, id: trs1.id };
		const invalidResponse = { status: TransactionStatus.FAIL, id: trs2.id };

		beforeEach(async () => {
			trs1.validate = sinonSandbox.stub().returns(validResponse);
			trs2.validate = sinonSandbox.stub().returns(invalidResponse);
		});

		it('should invoke validate() on each transaction', async () => {
			processTransactions.validateTransactions([trs1, trs2]);

			expect(trs1.validate).to.be.calledOnce;
			expect(trs2.validate).to.be.calledOnce;
		});

		it('should update responses for exceptions for invalid responses', async () => {
			const exceptionStub = sinonSandbox.stub();
			ProcessTransactions.__set__(
				'updateTransactionResponseForExceptionTransactions',
				exceptionStub
			);

			processTransactions.validateTransactions([trs1, trs2]);

			expect(exceptionStub).to.be.calledOnce;
			expect(exceptionStub).to.be.calledWithExactly(
				[invalidResponse],
				[trs1, trs2]
			);
		});

		it('should return transaction responses', async () => {
			const result = processTransactions.validateTransactions([trs1, trs2]);

			expect(result).to.be.eql({
				transactionsResponses: [validResponse, invalidResponse],
			});
		});
	});

	describe('checkPersistedTransactions()', () => {
		it('should resolve in empty response if called with empty array', async () => {
			const result = await processTransactions.checkPersistedTransactions([]);

			expect(result).to.be.eql({ transactionsResponses: [] });
		});
		it('should invoke entities.Transaction to check persistence of transactions', async () => {
			storageMock.entities.Transaction.get.resolves([trs1, trs2]);

			await processTransactions.checkPersistedTransactions([trs1, trs2]);

			expect(storageMock.entities.Transaction.get).to.be.calledOnce;
			expect(storageMock.entities.Transaction.get).to.be.calledWithExactly({
				id_in: [trs1.id, trs2.id],
			});
		});

		it('should return TransactionStatus.OK for non-persisted transactions', async () => {
			// Treat trs1 as persisted transaction
			storageMock.entities.Transaction.get.resolves([trs1]);

			const result = await processTransactions.checkPersistedTransactions([
				trs1,
				trs2,
			]);

			const transactionResponse = result.transactionsResponses.find(
				({ id }) => id === trs2.id
			);

			expect(transactionResponse.status).to.be.eql(TransactionStatus.OK);
			expect(transactionResponse.errors).to.be.eql([]);
		});

		it('should return TransactionStatus.FAIL for persisted transactions', async () => {
			// Treat trs1 as persisted transaction
			storageMock.entities.Transaction.get.resolves([trs1]);

			const result = await processTransactions.checkPersistedTransactions([
				trs1,
				trs2,
			]);

			const transactionResponse = result.transactionsResponses.find(
				({ id }) => id === trs1.id
			);

			expect(transactionResponse.status).to.be.eql(TransactionStatus.FAIL);
			expect(transactionResponse.errors).have.lengthOf(1);
			expect(transactionResponse.errors[0].message).to.be.eql(
				`Transaction is already confirmed: ${trs1.id}`
			);
		});
	});

	describe('applyGenesisTransactions()', () => {
		const tx = {};
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
		});

		it('should initialize the state store', async () => {
			await processTransactions.applyGenesisTransactions([trs1, trs2], tx);

			expect(StateStoreStub).to.be.calledOnce;
			expect(StateStoreStub).to.be.calledWithExactly(storageMock, {
				mutate: true,
				tx,
			});
		});

		it('should prepare all transactions', async () => {
			await processTransactions.applyGenesisTransactions([trs1, trs2]);

			expect(trs1.prepare).to.be.calledOnce;
			expect(trs1.prepare).to.be.calledWithExactly(stateStoreMock);

			expect(trs2.prepare).to.be.calledOnce;
			expect(trs2.prepare).to.be.calledWithExactly(stateStoreMock);
		});

		it('should apply all transactions', async () => {
			await processTransactions.applyGenesisTransactions([trs1, trs2]);

			expect(trs1.apply).to.be.calledOnce;
			expect(trs1.apply).to.be.calledWithExactly(stateStoreMock);

			expect(trs2.apply).to.be.calledOnce;
			expect(trs2.apply).to.be.calledWithExactly(stateStoreMock);
		});

		it('should add transaction to roundInformation', async () => {
			await processTransactions.applyGenesisTransactions([trs1, trs2]);

			expect(roundInformationMock.apply).to.be.calledTwice;
			expect(roundInformationMock.apply.firstCall.args).to.be.eql([
				stateStoreMock,
				trs1,
			]);
			expect(roundInformationMock.apply.secondCall.args).to.be.eql([
				stateStoreMock,
				trs2,
			]);
		});

		it('should add transaction to state store', async () => {
			await processTransactions.applyGenesisTransactions([trs1, trs2]);

			expect(stateStoreMock.transaction.add).to.be.calledTwice;
			expect(stateStoreMock.transaction.add.firstCall.args).to.be.eql([trs1]);
			expect(stateStoreMock.transaction.add.secondCall.args).to.be.eql([trs2]);
		});

		it('should override the status of transaction to TransactionStatus.OK', async () => {
			trs1.apply.returns({
				status: TransactionStatus.FAIL,
				id: trs1.id,
			});

			const result = await processTransactions.applyGenesisTransactions([trs1]);

			expect(result.transactionsResponses[0].status).to.be.eql(
				TransactionStatus.OK
			);
		});

		it('should return transaction responses and state store', async () => {
			const result = await processTransactions.applyGenesisTransactions([
				trs1,
				trs2,
			]);

			expect(result.stateStore).to.be.eql(stateStoreMock);
			expect(result.transactionsResponses).to.be.eql([
				trs1Response,
				trs2Response,
			]);
		});
	});

	describe('checkAllowedTransactions', () => {
		let checkAllowedTransactionsSpy;

		beforeEach(async () => {
			// Arrange
			checkAllowedTransactionsSpy = sinonSandbox.spy(
				processTransactions,
				'checkAllowedTransactions'
			);
		});

		it('should accept two exact arguments with proper data', async () => {
			// Act
			processTransactions.checkAllowedTransactions([trs1], dummyState);

			// Assert
			expect(checkAllowedTransactionsSpy).to.have.been.calledWithExactly(
				[trs1],
				dummyState
			);
		});

		it('should return a proper response format', async () => {
			// Act
			const response = processTransactions.checkAllowedTransactions(
				[trs1],
				dummyState
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
				...trs1[0],
				matcher: () => false,
			};

			// Act
			const response = processTransactions.checkAllowedTransactions(
				[disallowedTransaction],
				dummyState
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				disallowedTransaction.id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.FAIL
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(1);
			expect(response.transactionsResponses[0].errors[0]).to.be.instanceOf(
				Error
			);
			expect(response.transactionsResponses[0].errors[0].message).to.equal(
				`Transaction type ${
					disallowedTransaction.type
				} is currently not allowed.`
			);
		});

		it('should report a transaction as allowed if it does not implement matcher', async () => {
			// Arrange
			const { matcher, ...transactionWithoutMatcherImpl } = trs1;

			// Act
			const response = processTransactions.checkAllowedTransactions(
				[transactionWithoutMatcherImpl],
				dummyState
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				transactionWithoutMatcherImpl.id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);
		});

		it('in case of allowed transactions, it should return responses with TransactionStatus.OK and no errors', async () => {
			// Arrange
			const allowedTransaction = {
				...trs1[0],
				matcher: () => true,
			};

			// Act
			const response = processTransactions.checkAllowedTransactions(
				[allowedTransaction],
				dummyState
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(1);
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				allowedTransaction.id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);
		});

		it('should return a mix of responses including allowed and disallowed transactions', async () => {
			// Arrange
			const transactions = [
				trs1, // Allowed
				{
					...trs1,
					matcher: () => false, // Disallowed
				},
			];

			// Act
			const response = processTransactions.checkAllowedTransactions(
				transactions,
				dummyState
			);

			// Assert
			expect(response.transactionsResponses.length).to.equal(2);
			// Allowed transaction formatted response check
			expect(response.transactionsResponses[0]).to.have.property(
				'id',
				transactions[0].id
			);
			expect(response.transactionsResponses[0]).to.have.property(
				'status',
				TransactionStatus.OK
			);
			expect(response.transactionsResponses[0].errors.length).to.equal(0);

			// Allowed transaction formatted response check
			expect(response.transactionsResponses[1]).to.have.property(
				'id',
				transactions[1].id
			);
			expect(response.transactionsResponses[1]).to.have.property(
				'status',
				TransactionStatus.FAIL
			);
			expect(response.transactionsResponses[1].errors.length).to.equal(1);
			expect(response.transactionsResponses[1].errors[0]).to.be.instanceOf(
				Error
			);
			expect(response.transactionsResponses[1].errors[0].message).to.equal(
				`Transaction type ${transactions[1].type} is currently not allowed.`
			);
		});
	});

	describe('_getCurrentContext', () => {
		let result;

		beforeEach(async () => {
			// Act
			result = ProcessTransactions._getCurrentContext();
		});

		it('should call lastBlock.get', async () => {
			// Assert
			expect(paramScope.modules.blocks.lastBlock.get).to.have.been.called;
		});

		it('should return version, height and timestamp wrapped in an object', async () => {
			// Assert
			expect(result).to.have.property('blockVersion', dummyState.version);
			expect(result).to.have.property('blockHeight', dummyState.height);
			expect(result).to.have.property('blockTimestamp', dummyState.timestamp);
		});
	});
});
