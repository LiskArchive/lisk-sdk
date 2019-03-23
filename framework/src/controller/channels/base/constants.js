const INTERNAL_EVENTS = Object.freeze([
	'registeredToBus',
	'loading:started',
	'loading:finished',
]);

const eventWithModuleNameReg = /^([^\d][\w]+)((?::[^\d][\w]+)+)$/;

module.exports = {
	eventWithModuleNameReg,
	INTERNAL_EVENTS,
};
