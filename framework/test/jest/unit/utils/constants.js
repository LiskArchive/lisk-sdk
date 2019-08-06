const validator = require('../../../../src/controller/validator');
const {
	constantsSchema,
	applicationConfigSchema,
} = require('../../../../src/controller/schema');
const { deepFreeze } = require('./deep_freeze');

const sharedConstants = validator.parseEnvArgAndValidate(constantsSchema, {});
const appConfig = validator.parseEnvArgAndValidate(applicationConfigSchema, {});

const constants = deepFreeze({
	...sharedConstants,
	...appConfig.app.genesisConfig,
});

module.exports = {
	constants,
};
