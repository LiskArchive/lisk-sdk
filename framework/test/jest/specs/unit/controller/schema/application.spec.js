const application = require('../../../../../../src/controller/schema/application');

describe('schema/application.js', () => {
	// TODO: Fix this test case.
	// eslint-disable-next-line jest/no-disabled-tests
	it.skip('application schema must match to the snapshot.', () => {
		expect(application).toMatchSnapshot();
	});
});
