const genesisBlockSchema = require('../../../../../../src/controller/schema/genesis_block_schema');

describe('schema/genesis_block_schema.js', () => {
	it('genesis block schema must match to the snapshot.', () => {
		expect(genesisBlockSchema).toMatchSnapshot();
	});
});
