const lisk = require('../../src/utils/liskInstance');
const query = require('../../src/utils/query');

describe('query class with different parameters', () => {
	let stub;

	beforeEach(() => {
		stub = sinon.stub(lisk, 'sendRequest');
	});

	afterEach(() => {
		lisk.sendRequest.restore();
	});

	it('should query to isBlockQuery', () => {
		const route = 'blocks/get';
		const id = '5650160629533476718';
		const options = { id };

		query.isBlockQuery(id);

		(stub.calledWithExactly(route, options)).should.be.true();
	});

	it('should query to isAccountQuery', () => {
		const route = 'accounts';
		const address = '13782017140058682841L';
		const options = { address };

		query.isAccountQuery(address);

		(stub.calledWithExactly(route, options)).should.be.true();
	});

	it('should query to isTransactionQuery', () => {
		const route = 'transactions/get';
		const id = '16388447461355055139';
		const options = { id };

		query.isTransactionQuery(id);

		(stub.calledWithExactly(route, options)).should.be.true();
	});

	it('should query to isDelegateQuery', () => {
		const route = 'delegates/get';
		const username = 'lightcurve';
		const options = { username };

		query.isDelegateQuery(username);

		(stub.calledWithExactly(route, options)).should.be.true();
	});
});
