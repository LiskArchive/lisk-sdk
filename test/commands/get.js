import get from '../../src/commands/get';
import query from '../../src/utils/query';
import { setUpVorpalWithCommand } from './utils';

const tablify = require('../../src/utils/tablify');

const createRejectionHandler = restoreFn => (e) => {
	restoreFn();
	throw e;
};

const testCommandCallsQueryMethodWithValue = (
	vorpal, command, queryMethodName, value, stubResolutionValue,
) => {
	const stub = sinon.stub(query, queryMethodName).resolves(stubResolutionValue);
	const { restore } = stub;

	return vorpal.exec(command)
		.then(() => (stub.calledWithExactly(value)).should.be.equal(true))
		.then(restore, createRejectionHandler(restore));
};

describe('lisky get command palette', () => {
	const address = '13133549779353512613L';
	const blockId = '3641049113933914102';
	const delegateName = 'lightcurve';
	const transactionId = '16388447461355055139';

	const noTypeCommand = 'get';
	const noInputCommand = 'get account';
	const invalidTypeCommand = `get xxx ${address}`;
	const accountCommand = `get account ${address}`;
	const addressCommand = `get address ${address}`;
	const blockCommand = `get block ${blockId}`;
	const delegateCommand = `get delegate ${delegateName}`;
	const transactionCommand = `get transaction ${transactionId}`;

	const missingRequiredArgumentRegex = /Missing required argument/;
	const unknownVariableRegex = /Unsupported type\./;

	let vorpal;
	let capturedOutput = [];

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(get, capturedOutput);
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
		capturedOutput = [];
	});

	describe('queries', () => {
		it('should handle being called with no type', () => {
			return vorpal.exec(noTypeCommand)
				.then(result => (result).should.match(missingRequiredArgumentRegex));
		});

		it('should handle being called with no variadic', () => {
			return vorpal.exec(noInputCommand)
				.then(result => (result).should.match(missingRequiredArgumentRegex));
		});

		it('should handle unknown type names', () => {
			return vorpal.exec(invalidTypeCommand)
				.then(() => (capturedOutput[0]).should.match(unknownVariableRegex));
		});

		it('should get an account by address', () => {
			return testCommandCallsQueryMethodWithValue(vorpal, accountCommand, 'isAccountQuery', address, { account: {} });
		});

		it('should get an address', () => {
			return testCommandCallsQueryMethodWithValue(vorpal, addressCommand, 'isAccountQuery', address, { account: {} });
		});

		it('should get a block by id', () => {
			return testCommandCallsQueryMethodWithValue(vorpal, blockCommand, 'isBlockQuery', blockId, { block: {} });
		});

		it('should get a delegate by name', () => {
			return testCommandCallsQueryMethodWithValue(vorpal, delegateCommand, 'isDelegateQuery', delegateName, { delegate: {} });
		});

		it('should get a transaction by id', () => {
			return testCommandCallsQueryMethodWithValue(vorpal, transactionCommand, 'isTransactionQuery', transactionId, { transaction: {} });
		});

		it('should handle http errors', () => {
			const error = 'transaction not found';
			const { restore } = sinon.stub(query, 'isTransactionQuery').resolves({ error });

			return vorpal.exec(transactionCommand)
				.then(() => (capturedOutput[0]).should.match(new RegExp(error)))
				.then(restore, createRejectionHandler(restore));
		});
	});

	describe('options', () => {
		const jsonCommand = `${transactionCommand} -j`;
		const noJsonCommand = `${transactionCommand} --no-json`;
		const transaction = {
			one: 'two',
		};
		let stub;

		beforeEach(() => {
			stub = sinon.stub(query, 'isTransactionQuery').resolves({ transaction });
		});

		afterEach(() => {
			stub.restore();
		});

		describe('json output true', () => {
			it('should stringify JSON', () => {
				const spy = sinon.spy(JSON, 'stringify');
				const { restore } = spy;
				return vorpal.exec(jsonCommand)
					.then(() => {
						(spy.calledWithExactly(transaction)).should.be.true();
					})
					.then(restore, createRejectionHandler(restore));
			});

			it('should print json output', () => {
				return vorpal.exec(jsonCommand)
					.then(() => {
						(capturedOutput[0]).should.be.type('string');
						(JSON.parse.bind(null, capturedOutput[0])).should.not.throw();
					});
			});
		});

		describe('json output false', () => {
			it('should use tablify', () => {
				const spy = sinon.spy(tablify, 'default');
				const { restore } = spy;
				return vorpal.exec(noJsonCommand)
					.then(() => {
						(spy.calledWithExactly(transaction)).should.be.true();
					})
					.then(restore, createRejectionHandler(restore));
			});

			it('should print tablified output', () => {
				return vorpal.exec(noJsonCommand)
					.then(() => {
						(capturedOutput[0]).should.be.type('string');
						(JSON.parse.bind(null, capturedOutput[0])).should.throw(/Unexpected token/);
					});
			});
		});
	});
});
