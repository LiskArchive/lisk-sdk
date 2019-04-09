const MODULE_NAME = 'module';
const EVENT_NAME = 'event';

module.exports = Object.freeze({
	MODULE_NAME,
	EVENT_NAME,
	VALID_EVENT_NAME_ARG: `${MODULE_NAME}:${EVENT_NAME}`,
	INVALID_EVENT_NAME_ARG: `${MODULE_NAME}`,
	DATA: '#data',
});
