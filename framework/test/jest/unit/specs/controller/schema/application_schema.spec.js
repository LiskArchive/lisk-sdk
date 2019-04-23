const applicationSchema = require('../../../../../../src/controller/schema/application_config_schema');

describe('schema/application_config_schema.js', () => {
	it('application config schema must match to the snapshot.', () => {
		expect(applicationSchema).toMatchSnapshot();
	});
});
