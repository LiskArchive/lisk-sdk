const Vorpal = require('vorpal');
const common = require('../common');
const sinon = common.sinon;
const get = require('../../src/commands/get');
const query = require('../../src/utils/query');
const util = require('util');

const vorpal = new Vorpal();

vorpal.use(get);
vorpal.pipe(output => '');

describe('lisky get command palette', () => {

	it('should test command get account', () => {

		 let command = 'get account 13133549779353512613L';

		 sinon.stub(query, 'isAccountQuery');

		 vorpal.execSync(command);

		 (query.isAccountQuery.called).should.be.equal(true);

		 query.isAccountQuery.restore();

	});

	it('should have the right parameters with block', () => {

		 let command = 'get block 3641049113933914102';

		 sinon.stub(query, 'isBlockQuery');

		 vorpal.execSync(command);

		 (query.isBlockQuery.called).should.be.equal(true);

		 query.isBlockQuery.restore();

	});

	it('should have the right parameters with delegate', () => {

		let command = 'get delegate lightcurve';

		sinon.stub(query, 'isDelegateQuery');

		vorpal.execSync(command);

		(query.isDelegateQuery.called).should.be.equal(true);

		query.isDelegateQuery.restore();

	});

	it('should have the right parameters with transaction', () => {

		let command = 'get transaction 16388447461355055139';

		sinon.stub(query, 'isTransactionQuery');

		vorpal.execSync(command);

		(query.isTransactionQuery.called).should.be.equal(true);

		query.isTransactionQuery.restore();

	});

	it('should have the right parameters with transaction, handling response', () => {

		let command = 'get transaction 16388447461355055139';

		sinon.stub(query, 'isTransactionQuery').resolves({ transactionid: '123' });

		vorpal.execSync(command);

		(query.isTransactionQuery.called).should.be.equal(true);

		query.isTransactionQuery.restore();

	});

	it('should have the right parameters with transaction, handling error from http', () => {

		let command = 'get transaction 16388447461355055139';

		sinon.stub(query, 'isTransactionQuery').resolves({error: 'transaction not found'});

		vorpal.execSync(command);

		(query.isTransactionQuery.called).should.be.equal(true);

		query.isTransactionQuery.restore();

	});

});


describe('get command palette with json settings', () => {

	it('should have the right parameters with transactions', () => {

		let command = 'get transaction 16388447461355055139 -j';

		sinon.stub(query, 'isTransactionQuery').resolves({ transactionId: '123' });

		vorpal.execSync(command);

		(query.isTransactionQuery.called).should.be.equal(true);

		query.isTransactionQuery.restore();

	});

	it('should print no-json output', () => {
		let command = 'get transaction 16388447461355055139 --no-json';

		sinon.stub(query, 'isTransactionQuery');

		vorpal.execSync(command);

		(query.isTransactionQuery.called).should.be.equal(true);

		query.isTransactionQuery.restore();
	});

	it('should have the right parameters with transaction, handling error from http', () => {

		let command = 'get transaction 16388447461355055139 -j';

		sinon.stub(query, 'isTransactionQuery').resolves({error: 'transaction not found'});

		vorpal.execSync(command);

		(query.isTransactionQuery.called).should.be.equal(true);

		query.isTransactionQuery.restore();

	});

});
