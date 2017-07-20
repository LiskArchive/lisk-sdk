/* eslint-disable arrow-body-style */
const Vorpal = require('vorpal');
const get = require('../../src/commands/get');
const query = require('../../src/utils/query');

const createRejectionHandler = restoreFn => (e) => {
	restoreFn();
	throw e;
};

describe('lisky get command palette', () => {
	let vorpal;
	const transactionId = '16388447461355055139';
	const transactionCommand = `get transaction ${transactionId}`;

	beforeEach(() => {
		vorpal = new Vorpal();
		vorpal.use(get);
		vorpal.pipe(() => '');
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
	});

	it('should test command get account', () => {
		sinon.stub(query, 'isAccountQuery').resolves({ account: {} });
		const restore = query.isAccountQuery.restore;

		const command = 'get account 13133549779353512613L';
		return vorpal.exec(command)
			.then(() => (query.isAccountQuery.called).should.be.equal(true))
			.then(restore, createRejectionHandler(restore));
	});

	it('should have the right parameters with block', () => {
		sinon.stub(query, 'isBlockQuery').resolves({ block: {} });
		const restore = query.isBlockQuery.restore;

		const command = 'get block 3641049113933914102';
		return vorpal.exec(command)
			.then(() => (query.isBlockQuery.called).should.be.equal(true))
			.then(restore, createRejectionHandler(restore));
	});

	it('should have the right parameters with delegate', () => {
		sinon.stub(query, 'isDelegateQuery').resolves({ delegate: {} });
		const restore = query.isDelegateQuery.restore;

		const command = 'get delegate lightcurve';
		return vorpal.exec(command)
			.then(() => (query.isDelegateQuery.called).should.be.equal(true))
			.then(restore, createRejectionHandler(restore));
	});

	describe('get transaction', () => {
		let stub;

		beforeEach(() => {
			stub = sinon.stub(query, 'isTransactionQuery').resolves({ transaction: {} });
		});

		afterEach(() => {
			query.isTransactionQuery.restore();
		});

		it('should have the right parameters with transaction', () => {
			return vorpal.exec(transactionCommand)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});

		it('should have the right parameters with transaction, handling response', () => {
			return vorpal.exec(transactionCommand)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});

		it('should have the right parameters with transaction, handling error from http', () => {
			stub.resolves({ error: 'transaction not found' });

			return vorpal.exec(transactionCommand)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});
	});

	describe('options', () => {
		let stub;
		const jsonCommand = `${transactionCommand} -j`;
		const noJsonCommand = `${transactionCommand} --no-json`;

		beforeEach(() => {
			stub = sinon.stub(query, 'isTransactionQuery').resolves({ transaction: '{}' });
		});

		afterEach(() => {
			query.isTransactionQuery.restore();
		});

		it('should print json output', () => {
			return vorpal.exec(jsonCommand)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});

		it('should print no-json output', () => {
			return vorpal.exec(noJsonCommand)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});

		it('should have the right parameters with transaction, handling error from http', () => {
			stub.resolves({ error: 'transaction not found' });

			return vorpal.exec(jsonCommand)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});
	});
});
