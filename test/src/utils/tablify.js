const tablify = require('../../../src/utils/tablify');
const expect = require('chai').expect;

describe('#tablify', () => {

	it('should create a table from object', () => {

		let data = {
			data: 'data',
			moreData: 'data'
		};

		(tablify(data).toString()).should.be.equal('\u001b[90m┌──────────\u001b[39m\u001b[90m┬──────┐\u001b[39m\n\u001b[90m│\u001b[39m data     \u001b[90m│\u001b[39m data \u001b[90m│\u001b[39m\n\u001b[90m├──────────\u001b[39m\u001b[90m┼──────┤\u001b[39m\n\u001b[90m│\u001b[39m moreData \u001b[90m│\u001b[39m data \u001b[90m│\u001b[39m\n\u001b[90m└──────────\u001b[39m\u001b[90m┴──────┘\u001b[39m');

	});

	it('should create a table from object', () => {

		let data = {
			data: 'data',
			moreData: 'data'
		};

		expect( tablify(data) ).to.have.property('0');
	});

	it('should create a table from object', () => {

		let data = {

		};

		expect( tablify(data) ).to.not.have.property('0');
	});

	it('should create a table from object', () => {

		let data = {
			data: 'data'
		};

		(tablify(data)[0]).should.have.keys('data');
	});

});