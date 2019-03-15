const config = require('../../../config/unit/jest.config');

describe('config/unit/jest.config.js', () => {
	it('unit test config must match to the snapshot.', () => {
		expect(config).toMatchSnapshot();
	});
});
