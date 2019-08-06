const deepFreeze = o => {
	Object.freeze(o);
	if (o === undefined) {
		return o;
	}

	Object.getOwnPropertyNames(o).forEach(prop => {
		if (
			o[prop] !== null &&
			(typeof o[prop] === 'object' || typeof o[prop] === 'function') &&
			!Object.isFrozen(o[prop])
		) {
			deepFreeze(o[prop]);
		}
	});

	return o;
};

module.exports = {
	deepFreeze,
};
