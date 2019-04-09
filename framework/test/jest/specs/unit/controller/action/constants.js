const MODULE_NAME = 'module';
const ACTION_NAME = 'action';

module.exports = Object.freeze({
	ACTION_NAME,
	MODULE_NAME,
	INVALID_ACTION_NAME_ARG: '09',
	INVALID_ACTION_SOURCE_ARG: '123',
	VALID_ACTION_NAME_ARG: `${MODULE_NAME}:${ACTION_NAME}`,
	VALID_ACTION_SOURCE_ARG: 'source',
	PARAMS: '#params',
});
