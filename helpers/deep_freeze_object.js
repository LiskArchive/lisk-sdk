'use strict';

module.exports = function deepFreeze(o) {
	Object.freeze(o);

	Object.getOwnPropertyNames(o).forEach(prop => {
		if (
			Object.prototype.hasOwnProperty.call(o, prop) &&
			o[prop] !== null &&
			(typeof o[prop] === 'object' || typeof o[prop] === 'function') &&
			!Object.isFrozen(o[prop])
		) {
			deepFreeze(o[prop]);
		}
	});

	return o;
};
