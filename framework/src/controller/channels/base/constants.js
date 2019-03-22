const INTERNAL_EVENTS = Object.freeze([
	'registeredToBus',
	'loading:started',
	'loading:finished',
]);

const eventWithModuleNameReg = /[A-Za-z]+[A-Za-z0-9]*:[A-Za-z]+[A-Za-z0-9]*/;

module.exports = {
	eventWithModuleNameReg,
	INTERNAL_EVENTS,
};
