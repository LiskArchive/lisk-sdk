const assert = require('assert');

const moduleNameReg = /^[a-zA-Z][a-zA-Z0-9]*$/;
const eventWithModuleNameReg = /^([a-zA-Z][a-zA-Z0-9]*)((?::[a-zA-Z][a-zA-Z0-9]*)+)$/;

/**
 * An event class which instance will be received by every event listener
 *
 * @class
 * @memberof controller
 * @requires assert
 * @param {string} name - Can be simple event or be combination of module:event
 * @param {string|Object} [data] - Data associated with the event
 * @param {string} [source] - Source module which triggers the event
 */
function Event(name, data = null, source = null) {
	assert(
		eventWithModuleNameReg.test(name),
		`Event name "${name}" must be a valid name with module name.`
	);

	[, this.module, this.name] = eventWithModuleNameReg.exec(name);
	// Remove the first prefixed ':' symbol
	this.name = this.name.substring(1);
	this.data = data;

	if (source) {
		assert(
			moduleNameReg.test(source),
			`Source name "${source}" must be a valid module name.`
		);
		this.source = source;
	}
}

/**
 * Gets serialized data object for Event object.
 *
 * @return {Object}
 */
Event.prototype.serialize = function() {
	return {
		name: this.name,
		module: this.module,
		source: this.source,
		data: this.data,
	};
};

/**
 * Getter function for source and event label data.
 *
 * @return {string} stringified event object
 */
Event.prototype.toString = function() {
	return `${this.source} -> ${this.module}:${this.name}`;
};

/**
 * Getter function for event label data.
 *
 * @return {string} event label: key
 */
Event.prototype.key = function() {
	return `${this.module}:${this.name}`;
};

/**
 * Converts data to Event object.
 *
 * @param {Object|string} data - Data for Event object serialized or as object.
 * @return {module.Event}
 */
Event.deserialize = function(data) {
	let object = null;
	if (typeof data === 'string') object = JSON.parse(data);
	else object = data;
	return new Event(
		`${object.module}:${object.name}`,
		object.data,
		object.source
	);
};

module.exports = Event;
