import tablify from '../../src/utils/tablify';

describe('#tablify', () => {
	it('should create a table from an object', () => {
		const data = {
			one: 'two',
			three: 'four',
		};
		const table = tablify(data);

		(table).should.have.property('0').eql({ one: 'two' });
		(table).should.have.property('1').eql({ three: 'four' });
	});

	it('should create a table from an empty object', () => {
		const data = {};
		const table = tablify(data);

		(table).should.not.have.property('0');
	});
});
