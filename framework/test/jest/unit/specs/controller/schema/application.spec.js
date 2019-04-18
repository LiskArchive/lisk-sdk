const application = require('../../../../../../src/controller/schema/application');

describe('schema/application.js', () => {
	it('application schema must match to the snapshot.', () => {
		expect(application).toMatchSnapshot();
	});
});
