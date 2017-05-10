const should = require('should');
const lisky = require('../index');

describe('myModule', () => {
	describe('#up', () => {
		it('should export a function', () => {
			(lisky.up).should.be.type('function')
		});

		it('should add 1 to a number', () => {
			(lisky.up(1)).should.be.equal(2);
		});
	});
});