const common = require('../common');
const query = require('../../src/utils/query');

function createSpy (targetFunc) {

	const spy = function () {
		spy.args = arguments;
		spy.returnValue = targetFunc.apply(this, arguments);
		return spy.returnValue;
	};

	return spy;

}

describe('query class with different parameters', () => {


	it('should query to isBlockQuery', () => {

		let spiedFunction = createSpy(query.isBlockQuery);

		spiedFunction('5650160629533476718');

		(spiedFunction.args[0]).should.be.equal('5650160629533476718');

	});

	it('should query to isAccountQuery', () => {

		let spiedFunction = createSpy(query.isAccountQuery);

		spiedFunction('13782017140058682841L');

		(spiedFunction.args[0]).should.be.equal('13782017140058682841L');

	});

	it('should query to isTransactionQuery', () => {

		let spiedFunction = createSpy(query.isTransactionQuery);

		spiedFunction('16388447461355055139');

		(spiedFunction.args[0]).should.be.equal('16388447461355055139');

	});

	it('should query to isDelegateQuery', () => {

		let spiedFunction = createSpy(query.isDelegateQuery);

		spiedFunction('lightcurve');

		(spiedFunction.args[0]).should.be.equal('lightcurve');

	});

});
