const constants = require('../../../../../../src/controller/schema/constants');

describe('schema/constants.js', () => {
	it('constants schema must match to the snapshot.', () => {
		expect(constants).toMatchSnapshot();
	});
});
