/**
 * @namespace framework.controller.schema
 * @see Parent: {@link controller}
 */

const applicationConfigSchema = require('./application_config_schema');
const constantsSchema = require('./constants_schema');
const genesisBlockSchema = require('./genesis_block_schema');

module.exports = {
	applicationConfigSchema,
	constantsSchema,
	genesisBlockSchema,
};
