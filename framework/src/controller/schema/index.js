/**
 * @namespace framework.controller.schema
 * @see Parent: {@link controller}
 */

const applicationSchema = require('./application_schema');
const constantsSchema = require('./constants_schema');
const genesisBlockSchema = require('./genesis_block_schema');

module.exports = {
	applicationSchema,
	constantsSchema,
	genesisBlockSchema,
};
