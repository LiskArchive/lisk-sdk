const Event = require('../event');
const Action = require('../action');

const eventsList = new WeakMap();
const actionsList = new WeakMap();

const internalEvents = [
	'registeredToBus',
	'loading:started',
	'loading:finished',
];

/**
 * BaseChannel class which used as reference to implement others channels for bus to module communication
 *
 * @class
 * @memberof controller.channels
 * @requires modules.Event
 * @requires modules.Action
 * @type {module.BaseChannel}
 */
module.exports = class BaseChannel {
	/**
	 * Create the baseChannel object
	 *
	 * @param {string} moduleAlias - Label used for module
	 * @param {module.Event} events - Collection of events for event listener
	 * @param {module.Action} actions - Collection of actions for event listener
	 * @param {Object} [options] - Options impacting events and actions list
	 * @param {boolean} [options.skipInternalEvents] - Skip internal events
	 *
	 * @throws Framework.errors.TypeError
	 */
	constructor(moduleAlias, events, actions, options = {}) {
		this.moduleAlias = moduleAlias;
		this.options = options;

		eventsList.set(
			this,
			(options.skipInternalEvents ? events : internalEvents.concat(events)).map(
				e => new Event(`${this.moduleAlias}:${e}`, null, null)
			)
		);
		actionsList.set(
			this,
			actions.map(a => new Action(`${this.moduleAlias}:${a}`, null, null))
		);
	}

	getActions() {
		return actionsList.get(this);
	}

	getEvents() {
		return eventsList.get(this);
	}

	// eslint-disable-next-line class-methods-use-this
	async registerToBus() {
		throw new TypeError('This method must be implemented in child classes. ');
	}

	// Listen to any event happening in the application
	// Specified as moduleName:eventName
	// If its related to your own moduleAlias specify as :eventName
	// eslint-disable-next-line no-unused-vars, class-methods-use-this
	subscribe(eventName, cb) {
		throw new TypeError('This method must be implemented in child classes. ');
	}

	// Publish the event on the channel
	// Specified as moduleName:eventName
	// If its related to your own moduleAlias specify as :eventName
	// eslint-disable-next-line no-unused-vars, class-methods-use-this
	publish(eventName, data) {
		throw new TypeError('This method must be implemented in child classes. ');
	}

	// Register action available to your moduleAlias
	// eslint-disable-next-line no-unused-vars, class-methods-use-this
	action(actionName, cb) {
		throw new TypeError('This method must be implemented in child classes. ');
	}

	// Call action of any moduleAlias through controller
	// Specified as moduleName:actionName
	// eslint-disable-next-line no-unused-vars, class-methods-use-this
	async invoke(actionName, params) {
		throw new TypeError('This method must be implemented in child classes. ');
	}

	isValidEventName(name, throwError = true) {
		const result = /[A-Za-z0-9]+:[A-Za-z0-9]+/.test(name);
		if (throwError && !result) {
			throw new Error(
				`[${this.moduleAlias.alias}] Invalid event name ${name}.`
			);
		}
		return result;
	}

	isValidActionName(name, throwError = true) {
		const result = /[A-Za-z0-9]+:[A-Za-z0-9]+/.test(name);
		if (throwError && !result) {
			throw new Error(
				`[${this.moduleAlias.alias}] Invalid action name ${name}.`
			);
		}
		return result;
	}
};
