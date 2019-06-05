const { Delegates } = require('./delegates');

class Dpos {
	constructor({ storage }) {
		this.storage = storage;

		this.delegates = new Delegates({
			storage,
		});
	}
}

module.exports = {
	Dpos,
};
