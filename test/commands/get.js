require('../common');
const Vorpal = require('vorpal');
const get = require('../../src/commands/get');
const query = require('../../src/utils/query');
const util = require('util');

describe('lisky get command palette', () => {
	let vorpal;
	const transactionId = '16388447461355055139';
	const transactionCommand = `get transaction ${ transactionId }`;

	beforeEach(() => {
		vorpal = new Vorpal();
		vorpal.use(get);
		vorpal.pipe(output => '');
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
	});

	it('should test command get account', () => {
		 sinon.stub(query, 'isAccountQuery');

		 const command = 'get account 13133549779353512613L';
		 vorpal.execSync(command);

		 (query.isAccountQuery.called).should.be.equal(true);

		 query.isAccountQuery.restore();

	});

	it('should have the right parameters with block', () => {
		 sinon.stub(query, 'isBlockQuery');

		 const command = 'get block 3641049113933914102';
		 vorpal.execSync(command);

		 (query.isBlockQuery.called).should.be.equal(true);

		 query.isBlockQuery.restore();

	});

	it('should have the right parameters with delegate', () => {
		sinon.stub(query, 'isDelegateQuery');

		const command = 'get delegate lightcurve';
		vorpal.execSync(command);

		(query.isDelegateQuery.called).should.be.equal(true);

		query.isDelegateQuery.restore();

	});

	describe('get transaction', () => {
		let stub;

		beforeEach(() => {
			stub = sinon.stub(query, 'isTransactionQuery');
		});

		afterEach(() => {
			query.isTransactionQuery.restore();
		});

		it('should have the right parameters with transaction', () => {
			vorpal.execSync(transactionCommand);
			(query.isTransactionQuery.called).should.be.equal(true);
		});

		it('should have the right parameters with transaction, handling response', () => {
			stub.resolves({ transactionid: '123' });

			vorpal.execSync(transactionCommand);

			(query.isTransactionQuery.called).should.be.equal(true);
		});

		it('should have the right parameters with transaction, handling error from http', () => {
			stub.resolves({error: 'transaction not found'});

			vorpal.execSync(transactionCommand);

			(query.isTransactionQuery.called).should.be.equal(true);
		});

	});

	describe('options', () => {
		let stub;
		const jsonCommand = `${ transactionCommand } -j`;
		const noJsonCommand = `${ transactionCommand } --no-json`;

		beforeEach(() => {
			stub = sinon.stub(query, 'isTransactionQuery');
		});

		afterEach(() => {
			query.isTransactionQuery.restore();
		});

		it('should print json output', () => {
			stub.resolves({ transactionId: '123' });

			vorpal.execSync(jsonCommand);

			(query.isTransactionQuery.called).should.be.equal(true);
		});

		it('should print no-json output', () => {
			vorpal.execSync(noJsonCommand);
			(query.isTransactionQuery.called).should.be.equal(true);
		});

		it('should have the right parameters with transaction, handling error from http', () => {
			stub.resolves({error: 'transaction not found'});

			vorpal.execSync(jsonCommand);

			(query.isTransactionQuery.called).should.be.equal(true);
		});

	});

});
