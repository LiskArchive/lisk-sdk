const config = require('../../../../../../src/controller/schema/config');

describe('schema/config.js', () => {
	it('schema config must match to the snapshot.', () => {
		expect(config).toMatchSnapshot();
	});
});
