const Delegates = require('./delegates');

module.exports = class Dpos {
	constructor({ storage, logger }) {
		this.delegate = new Delegates({ storage, logger });
	}

	async getRoundDelegates(round) {
		return this.delegates.getRoundDelegates(round);
	}
};
