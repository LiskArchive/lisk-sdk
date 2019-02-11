const Promise = require('bluebird');
const { EventEmitter2 } = require('eventemitter2');
const Action = require('./action');

const CONTROLLER_IDENTIFIER = 'lisk';

/**
 * Bus responsible to maintain communication between modules
 *
 * @namespace Framework
 * @requires bluebird
 * @requires eventemitter2
 * @requires module.Action
 * @type {module.Bus}
 */
module.exports = class Bus extends EventEmitter2 {
	/**
	 * Create the bus object
	 *
	 * @param {Object} controller - Controller object
	 * @param {Object} options - EventEmitter2 native options object
	 * @see {@link https://github.com/EventEmitter2/EventEmitter2/blob/master/eventemitter2.d.ts|String}
	 */
	constructor(controller, options) {
		super(options);
		this.controller = controller;

		// Hash map used instead of arrays for performance.
		this.actions = {};
		this.events = {};
	}

	/**
	 * Placeholder function.
	 *
	 * @async
	 * @return {Promise.<void>}
	 */
	// eslint-disable-next-line class-methods-use-this
	async setup() {
		// Place holder for RPC server connection
		return Promise.resolve();
	}

	/**
	 * Register new channel for bus.
	 *
	 * @async
	 * @param {string} moduleAlias - Alias for module used during registration
	 * @param {Array.<module.Event>} events - List of events
	 * @param {Array.<module.Action>} actions - List of actions
	 * @param {Object} options - Options related to registering channel (unused variable)
	 *
	 * @throws {Error} If event name is already registered.
	 */
	// eslint-disable-next-line no-unused-vars
	async registerChannel(moduleAlias, events, actions, options) {
		events.forEach(e => {
			const eventName = `${moduleAlias}:${e}`;
			if (this.events[eventName]) {
				throw new Error(`Event "${eventName}" already registered with bus.`);
			}
			this.events[eventName] = true;
		});

		actions.forEach(a => {
			const actionName = `${moduleAlias}:${a}`;
			if (this.actions[actionName]) {
				throw new Error(`Action "${actionName}" already registered with bus.`);
			}
			this.actions[actionName] = true;
		});
	}

	/**
	 * Invoke action on bus.
	 *
	 * @param {Object|string} actionData - Object or stringified object containing action data like name, module, souce, and params.
	 *
	 * @throws {Error} If action is not registered to bus.
	 */
	invoke(actionData) {
		const action = Action.deserialize(actionData);

		if (action.module === CONTROLLER_IDENTIFIER) {
			return this.controller.channel.invoke(action);
		}

		if (this.actions[action.key()]) {
			return this.controller.channels[action.module].invoke(action);
		}

		throw new Error(`Action ${action.key()} is not registered to bus.`);
	}

	/**
	 * Emit event with its data on bus.
	 *
	 * @param {string} eventName - Name of the event
	 * @param {string} eventValue - Attached value for event
	 *
	 * @throws {Error} If event name does not exist to bus.
	 */
	emit(eventName, eventValue) {
		if (!this.getEvents().includes(eventName)) {
			throw new Error(`Event ${eventName} is not registered to bus.`);
		}
		super.emit(eventName, eventValue); // Use Emit function from EventEmitter2 package
	}

	/**
	 * Get all actions
	 *
	 * @return {Array.<module.Action>}
	 */
	getActions() {
		return Object.keys(this.actions);
	}

	/**
	 * Get all events
	 *
	 * @return {Array.<module.Event>}
	 */
	getEvents() {
		return Object.keys(this.events);
	}
};
