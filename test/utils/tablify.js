const tablify = require('../../src/utils/tablify');

describe('#tablify', () => {
	it('should create a table from object', () => {
		const data = {
			data: 'data',
			moreData: 'data',
		};

		(tablify(data).toString()).should.be.equal('\u001b[90m┌──────────\u001b[39m\u001b[90m┬──────┐\u001b[39m\n\u001b[90m│\u001b[39m data     \u001b[90m│\u001b[39m data \u001b[90m│\u001b[39m\n\u001b[90m├──────────\u001b[39m\u001b[90m┼──────┤\u001b[39m\n\u001b[90m│\u001b[39m moreData \u001b[90m│\u001b[39m data \u001b[90m│\u001b[39m\n\u001b[90m└──────────\u001b[39m\u001b[90m┴──────┘\u001b[39m');
	});

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
