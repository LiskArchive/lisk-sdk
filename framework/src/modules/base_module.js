const { ImplementationMissingError } = require('../errors');

/* eslint-disable class-methods-use-this,no-unused-vars */

module.exports = class BaseModule {
	constructor(options) {
		this.options = options;
	}

	static get alias() {
		throw new ImplementationMissingError();
	}

	static get info() {
		throw new ImplementationMissingError();
	}

	get defaults() {
		// This interface is not required to be implemented
		return {};
	}

	get events() {
		// This interface is not required to be implemented
		return [];
	}

	get actions() {
		// This interface is not required to be implemented
		return {};
	}

	async load(channel) {
		throw new ImplementationMissingError();
	}

	async unload() {
		// This interface is not required.
		return true;
	}
};
