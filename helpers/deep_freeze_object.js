'use strict';

module.exports = function deepFreeze(o) {
	Object.freeze(o);

	Object.getOwnPropertyNames(o).forEach(prop => {
		if (
			o[prop] !== null &&
			typeof o[prop] === 'object' &&
			!Object.isFrozen(o[prop])
		) {
			deepFreeze(o[prop]);
		}
	});

	return o;
};
