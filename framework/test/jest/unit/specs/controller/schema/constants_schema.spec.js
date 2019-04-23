const constantsSchema = require('../../../../../../src/controller/schema/constants_schema');

describe('schema/constants_schema.js', () => {
	it('constants schema must match to the snapshot.', () => {
		expect(constantsSchema).toMatchSnapshot();
	});
});
