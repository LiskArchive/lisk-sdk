const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const ProcessTransactions = require('../../../../../../src/modules/chain/submodules/process_transactions');
const {
	composeTransactionSteps,
} = require('../../../../../../src/modules/chain/logic/process_transaction');

describe('ProcessTransactions', () => {
	let processTransactions;
	const dummyTransactions = [
		{
			id: 'aTransactionId',
			matcher: () => true,
			type: 0,
		},
	];
	const dummyState = {
		version: 1,
		height: 1,
		timestamp: 'aTimestamp',
	};
	const scope = {
		modules: {
			blocks: {
				lastBlock: {
					get: sinonSandbox.stub().returns(dummyState),
				},
			},
		},
	};

	beforeEach(async () => {
		// Act
		processTransactions = new ProcessTransactions(() => {}, {
			components: {},
			logic: {},
		});
		processTransactions.onBind(scope);
	});

	describe('#checkAllowedTransactions', () => {
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
			processTransactions.checkAllowedTransactions(
				dummyTransactions,
				dummyState
			);

			// Assert
			expect(checkAllowedTransactionsSpy).to.have.been.calledWithExactly(
				dummyTransactions,
				dummyState
			);
		});

		it('should return a proper response format', async () => {
			// Act
			const response = processTransactions.checkAllowedTransactions(
				dummyTransactions,
				dummyState
			);

			// Assert
			expect(response).to.have.deep.property('transactionsResponses', [
				{
					id: 'aTransactionId',
					status: 1,
					errors: [],
				},
			]);
		});

		it('in case of non allowed transactions, it should return responses with TransactionStatus.FAIL and proper error message', async () => {
			// Arrange
			const disallowedTransaction = {
				...dummyTransactions[0],
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
			const {
				matcher,
				...transactionWithoutMatcherImpl
			} = dummyTransactions[0];

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
				...dummyTransactions[0],
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
				dummyTransactions[0], // Allowed
				{
					...dummyTransactions[0],
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

	describe('#_getCurrentContext', () => {
		let result;

		beforeEach(async () => {
			// Act
			result = ProcessTransactions._getCurrentContext();
		});

		it('should call lastBlock.get', async () => {
			// Assert
			expect(scope.modules.blocks.lastBlock.get).to.have.been.called;
		});

		it('should return version, height and timestamp wrapped in an object', async () => {
			// Assert
			expect(result).to.have.property('blockVersion', dummyState.version);
			expect(result).to.have.property('blockHeight', dummyState.height);
			expect(result).to.have.property('blockTimestamp', dummyState.timestamp);
		});
	});

	describe('#composeTransactionSteps', () => {
		const transactions = [
			{
				id: 'anId',
				matcher: () => true,
				type: 0,
			},
			{
				id: 'anotherId',
				matcher: () => false,
				type: 1,
			},
		];

		const step1Response = {
			transactionsResponses: [
				{
					id: 'id1',
					status: TransactionStatus.FAIL,
				},
			],
		};

		const step2Response = {
			transactionsResponses: [
				{
					id: 'id2',
					status: TransactionStatus.OK,
				},
			],
		};

		const step1 = sinonSandbox.stub().returns(step1Response);
		const step2 = sinonSandbox.stub().returns(step2Response);
		const composedFunction = composeTransactionSteps(step1, step2);
		let result;

		beforeEach(async () => {
			result = await composedFunction(transactions);
		});

		it('should return a combination of the result of executing both steps', async () => {
			// Assert
			expect(result).to.deep.equal({
				transactionsResponses: [
					...step1Response.transactionsResponses,
					...step2Response.transactionsResponses,
				],
			});
		});

		it('should only pass successfull transactions to the next step', async () => {
			// Assert
			expect(step2).to.have.been.calledWith([]);
		});
	});
});
