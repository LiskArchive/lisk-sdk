'use strict';

const { EventEmitter } = require('events');
const { ImplementationPendingError } = require('../errors');

class BaseAdapter extends EventEmitter {
	/**
	 * Constructor for the adapter
	 * @param {Object} options
	 * @param {String} options.name
	 * @param {Boolean} options.inTest
	 */
	constructor(options) {
		super();
		this.engineName = options.name;
		this.inTest = options.inTest;
	}

	// eslint-disable-next-line class-methods-use-this
	connect() {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	disconnect() {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	execute() {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	executeFile() {
		throw new ImplementationPendingError();
	}

	// eslint-disable-next-line class-methods-use-this
	loadSQLFile() {
		throw new ImplementationPendingError();
	}
}

module.exports = BaseAdapter;
