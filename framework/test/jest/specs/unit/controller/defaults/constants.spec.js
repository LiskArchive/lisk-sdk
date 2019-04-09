const constants = require('../../../../../../src/controller/defaults/constants');

describe('controller/defaults/constants.js', () => {
	it('constants schema must match to the snapshot.', () => {
		expect(constants).toMatchSnapshot();
	});
});
