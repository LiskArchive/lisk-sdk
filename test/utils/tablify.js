const tablify = require('../../src/utils/tablify');

describe('#tablify', () => {

	it('should create a table from object', () => {
		const data = {
			data: 'data',
			moreData: 'data',
		};

		(tablify(data)).should.have.property('0');
	});

	it('should create a table from object', () => {
		const data = {};

		(tablify(data)).should.not.have.property('0');
	});

	it('should create a table from object', () => {
		const data = {
			data: 'data',
		};

		(tablify(data)[0]).should.have.keys('data');
	});
});
