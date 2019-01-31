const assert = require('assert');

const moduleNameReg = /^[a-zA-Z][a-zA-Z0-9]*$/;
const actionWithModuleNameReg = /^[a-zA-Z][a-zA-Z0-9]*:[a-zA-Z][a-zA-Z0-9]*$/;

module.exports = class Action {
	/**
	 *
	 * @param eventName - Can be simple event or be combination of module:event
	 * @param {array} params - Params associated with the action
	 * @param moduleName - Module name if event name does not have its prefix
	 */
	constructor(name, params = null, source = null) {
		assert(
			actionWithModuleNameReg.test(name),
			`Action name "${name}" must be a valid name with module name.`
		);
		[this.module, this.name] = name.split(':');
		this.params = params;

		if (source) {
			assert(
				moduleNameReg.test(source),
				`Source name "${source}" must be a valid module name.`
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
		let object = null;
		if (typeof data === 'string') object = JSON.parse(data);
		else object = data;
		return new Action(
			`${object.module}:${object.name}`,
			object.params,
			object.source
		);
	}

	toString() {
		return `${this.source} -> ${this.module}:${this.name}`;
	}

	key() {
		return `${this.module}:${this.name}`;
	}
};
