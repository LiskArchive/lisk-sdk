/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const assert = require('assert');

const { eventWithModuleNameReg } = require('./channels/base/constants');

/**
 * An event class which instance will be received by every event listener
 *
 * @class
 * @memberof framework.controller
 * @requires assert
 * @type {module.Event}
 */
class Event {
	/**
	 * Create Event object.
	 *
	 * @param {string} name - Combination of module:event
	 * @param {string|Object} [data] - Data associated with the event
	 */
	constructor(name, data = null) {
		assert(
			eventWithModuleNameReg.test(name),
			`Event name "${name}" must be a valid name with module name.`,
		);
		this.data = data;
		[, this.module, this.name] = eventWithModuleNameReg.exec(name);
		// Remove the first prefixed ':' symbol
		this.name = this.name.substring(1);
	}

	/**
	 * Gets serialized data object for Event object.
	 *
	 * @return {Object}
	 */
	serialize() {
		return {
			name: this.name,
			module: this.module,
			data: this.data,
		};
	}

	/**
	 * Getter function for event label data.
	 *
	 * @return {string} stringified event object
	 */
	toString() {
		return `${this.module}:${this.name}`;
	}

	/**
	 * Getter function for event label data.
	 *
	 * @return {string} event label: key
	 */
	key() {
		return `${this.module}:${this.name}`;
	}

	/**
	 * Converts data to Event object.
	 *
	 * @param {Object|string} data - Data for Event object serialized or as object.
	 * @return {module.Event}
	 */
	static deserialize(data) {
		let parsedEvent = null;
		if (typeof data === 'string') {
			parsedEvent = JSON.parse(data);
		} else {
			parsedEvent = data;
		}

		return new Event(
			`${parsedEvent.module}:${parsedEvent.name}`,
			parsedEvent.data,
		);
	}
}

module.exports = Event;
