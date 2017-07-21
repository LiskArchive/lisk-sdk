import Vorpal from 'vorpal';
import list from '../../src/commands/list';
import query from '../../src/utils/query';

const createRejectionHandler = restoreFn => (e) => {
	restoreFn();
	throw e;
};

describe('lisky list command palette', () => {
	let vorpal;

	beforeEach(() => {
		vorpal = new Vorpal();
		vorpal.use(list);
		vorpal.pipe(() => '');
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
	});

	it('should handle being called with no type', () => {
		const command = 'list';
		return vorpal.exec(command)
			.then(result => (result).should.match(/Missing required argument/));
	});

	it('should handle being called with no variadic', () => {
		const command = 'list accounts';
		return vorpal.exec(command)
			.then(result => (result).should.match(/Missing required argument/));
	});

	it('should test command list accounts', () => {
		sinon.stub(query, 'isAccountQuery');
		const restore = query.isAccountQuery.restore;

		const command = 'list accounts 13133549779353512613L 13133549779353512613L';
		return vorpal.exec(command)
			.then(() => (query.isAccountQuery.called).should.be.equal(true))
			.then(restore, createRejectionHandler(restore));
	});

	it('should have the right parameters with block', () => {
		sinon.stub(query, 'isBlockQuery');
		const restore = query.isBlockQuery.restore;

		const command = 'list blocks 3641049113933914102 5650160629533476718';
		return vorpal.exec(command)
			.then(() => (query.isBlockQuery.called).should.be.equal(true))
			.then(restore, createRejectionHandler(restore));
	});

	it('should have the right parameters with delegate', () => {
		sinon.stub(query, 'isDelegateQuery');
		const restore = query.isDelegateQuery.restore;

		const command = 'list delegates lightcurve tosch';
		return vorpal.exec(command)
			.then(() => (query.isDelegateQuery.called).should.be.equal(true))
			.then(restore, createRejectionHandler(restore));
	});

	describe('list transactions', () => {
		let stub;
		const command = 'list transactions 16388447461355055139 14735719251498448056';

		beforeEach(() => {
			stub = sinon.stub(query, 'isTransactionQuery');
		});

		afterEach(() => {
			query.isTransactionQuery.restore();
		});

		it('should have the right parameters with transaction', () => vorpal.exec(command)
			.then(() => (query.isTransactionQuery.called).should.be.equal(true)));

		it('should have the right parameters with transaction, handling response', () => {
			stub.resolves({ transactionid: '123' });

			return vorpal.exec(command)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});

		it('should have the right parameters with transaction, handling error from http', () => {
			stub.resolves({ error: 'transaction not found' });

			return vorpal.exec(command)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});
	});

	describe('options', () => {
		let stub;
		const transactionsCommand = 'list transactions 16388447461355055139 14735719251498448056';
		const jsonCommand = `${transactionsCommand} -j`;
		const noJsonCommand = `${transactionsCommand} --no-json`;

		beforeEach(() => {
			stub = sinon.stub(query, 'isTransactionQuery');
		});

		afterEach(() => {
			query.isTransactionQuery.restore();
		});

		it('should print json output', () => {
			stub.resolves({ transactionId: '123' });

			return vorpal.exec(jsonCommand)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});

		it('should print no-json output', () => {
			stub.resolves({ transactionId: '123' });

			return vorpal.exec(noJsonCommand)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});

		it('should print json, handling error from http', () => {
			stub.resolves({ error: 'transaction not found' });

			return vorpal.exec(jsonCommand)
				.then(() => (query.isTransactionQuery.called).should.be.equal(true));
		});
	});
});
