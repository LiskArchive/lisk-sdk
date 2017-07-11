require('../common');
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
		const spiedFunction = createSpy(query.isBlockQuery);

		spiedFunction('5650160629533476718');

		(spiedFunction.args[0]).should.be.equal('5650160629533476718');
	});

	it('should query to isAccountQuery', () => {
		const spiedFunction = createSpy(query.isAccountQuery);

		spiedFunction('13782017140058682841L');

		(spiedFunction.args[0]).should.be.equal('13782017140058682841L');
	});

	it('should query to isTransactionQuery', () => {
		const spiedFunction = createSpy(query.isTransactionQuery);

		spiedFunction('16388447461355055139');

		(spiedFunction.args[0]).should.be.equal('16388447461355055139');
	});

	it('should query to isDelegateQuery', () => {
		const spiedFunction = createSpy(query.isDelegateQuery);

		spiedFunction('lightcurve');

		(spiedFunction.args[0]).should.be.equal('lightcurve');
	});

});
