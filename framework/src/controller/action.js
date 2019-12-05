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

class Action {
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

	serialize() {
		return {
			name: this.name,
			module: this.module,
			source: this.source,
			params: this.params,
		};
	}

	static deserialize(data) {
		const parsedAction = typeof data === 'string' ? JSON.parse(data) : data;
		return new Action(
			`${parsedAction.module}:${parsedAction.name}`,
			parsedAction.params,
			parsedAction.source,
		);
	}

	toString() {
		return `${this.source} -> ${this.module}:${this.name}`;
	}

	key() {
		return `${this.module}:${this.name}`;
	}
}

module.exports = Action;
