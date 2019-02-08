const Promise = require('bluebird');
const { EventEmitter2 } = require('eventemitter2');
const Action = require('./action');

const CONTROLLER_IDENTIFIER = 'lisk';

/**
 * Bus responsible to maintain communication between modules
 *
 * @namespace Framework
 * @type {module.Bus}
 */
module.exports = class Bus extends EventEmitter2 {
	constructor(controller, options) {
		super(options);
		this.controller = controller;

		// Hash map used instead of arrays for performance.
		this.actions = {};
		this.events = {};
	}

	// eslint-disable-next-line class-methods-use-this
	async setup() {
		// Place holder for RPC server connection
		return Promise.resolve();
	}

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

	emit(eventName, eventValue) {
		if (!this.getEvents().includes(eventName)) {
			throw new Error(`Event ${eventName} is not registered to bus.`);
		}
		super.emit(eventName, eventValue);
	}

	getActions() {
		return Object.keys(this.actions);
	}

	getEvents() {
		return Object.keys(this.events);
	}
};
