const Delegates = require('./delegates');

const __methods = {
	delegates: new WeakMap(),
};

module.exports = class Dpos {
	constructor({ storage, logger }) {
		__methods.delegates.set(this, new Delegates({ storage, logger }));
	}

	async getRoundDelegates(round) {
		return __methods.delegates.get(this).getRoundDelegates(round);
	}
};
