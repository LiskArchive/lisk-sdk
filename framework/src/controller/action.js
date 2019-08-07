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

const moduleNameReg = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const actionWithModuleNameReg = /^[a-zA-Z][a-zA-Z0-9_]*:[a-zA-Z][a-zA-Z0-9]*$/;

/**
 * An action class which instance will be received by every event listener
 *
 * @class
 * @memberof framework.controller
 * @requires assert
 */
class Action {
	/**
	 * Create Action object.
	 *
	 * @param {string} name - Can be simple event or be combination of module:event
	 * @param {Array} [params] - Params associated with the action
	 * @param {string} [source] - Module name if event name does not have its prefix
	 */
	constructor(name, params = null, source = null) {
		assert(
			actionWithModuleNameReg.test(name),
			`Action name "${name}" must be a valid name with module name.`,
		);
		[this.module, this.name] = name.split(':');
		this.params = params;

		if (source) {
			assert(
				moduleNameReg.test(source),
				`Source name "${source}" must be a valid module name.`,
			);
			this.source = source;
		}
	}

	/**
	 * Gets serialized data object for Action object.
	 *
	 * @return {Object}
	 */
	serialize() {
		return {
			name: this.name,
			module: this.module,
			source: this.source,
			params: this.params,
		};
	}

	/**
	 * Converts data to Action object.
	 *
	 * @param {Object|string} data - Data for Action object serialized or as object.
	 * @return {module.Action}
	 */
	static deserialize(data) {
		const parsedAction = typeof data === 'string' ? JSON.parse(data) : data;
		return new Action(
			`${parsedAction.module}:${parsedAction.name}`,
			parsedAction.params,
			parsedAction.source,
		);
	}

	/**
	 * Getter function for source and action label data.
	 *
	 * @return {string} stringified action object
	 */
	toString() {
		return `${this.source} -> ${this.module}:${this.name}`;
	}

	/**
	 * Getter function for action label data.
	 *
	 * @return {string} action label: key
	 */
	key() {
		return `${this.module}:${this.name}`;
	}
}

module.exports = Action;
