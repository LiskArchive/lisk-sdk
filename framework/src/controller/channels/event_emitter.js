const Event = require('../event');
const Action = require('../action');
const BaseChannel = require('./base');

/**
 * Channel responsible to communicate with bus for modules running in same process
 *
 * @namespace Framework.channels
 * @requires module.Event
 * @requires module.Action
 * @requires channels/base
 * @type {module.EventEmitterChannel}
 */
module.exports = class EventEmitterChannel extends BaseChannel {
	/**
	 * Create new evnt emitter channel for module.
	 *
	 * @param {string} moduleAlias - A unique module name accessed through out the system
	 * @param {Array.<module.Event>} events - Array of events
	 * @param {Array.<module.Action>} actions - Array of actions
	 * @param {module.Bus} bus - Bus responsible to maintain communication between modules
	 * @param {Object} [options] - Options impacting events and actions list
	 * @param {boolean} [options.skipInternalEvents] - Skip internal events
	 */
	constructor(moduleAlias, events, actions, bus, options = {}) {
		super(moduleAlias, events, actions, options);
		this.bus = bus;
		this.actionMap = {};
	}

	/**
	 * Register new channel on bus.
	 *
	 * @async
	 */
	async registerToBus() {
		await this.bus.registerChannel(
			this.moduleAlias,
			this.getEvents().map(e => e.name),
			this.getActions().map(a => a.name),
			{}
		);
	}

	/**
	 * Subscribe for a specific event.
	 *
	 * @param {string} eventName - Name of event to subscribe on
	 * @returns {setImmediateCallback} cb, err, self - The callback that handles events
	 */
	subscribe(eventName, cb) {
		this.bus.on(new Event(eventName).key(), data =>
			setImmediate(cb, Event.deserialize(data))
		);
	}

	/**
	 * Add one time listener for event.
	 *
	 * @param {string} eventName - Name of event to subscribe on
	 * @returns {setImmediateCallback} cb, err, self - The callback that handles events
	 */
	once(eventName, cb) {
		this.bus.once(new Event(eventName).key(), data =>
			setImmediate(cb, Event.deserialize(data))
		);
	}

	/**
	 * Adds a listener to the end of the listeners array for the specified event.
	 *
	 * @param {string} eventName - Name of event to subscribe on
	 * @param {Object} data - Data to publish with event
	 */
	publish(eventName, data) {
		const event = new Event(eventName, data, this.moduleAlias);

		this.bus.emit(event.key(), event.serialize());
	}

	/**
	 * Register new action.
	 *
	 * @param {string} actionName - Name of action to create
	 * @param {requestCallback} cb - The callback that handles the specified action
	 */
	action(actionName, cb) {
		const action = new Action(`${this.moduleAlias}:${actionName}`, null, null);
		this.actionMap[action.key()] = cb;
	}

	/**
	 * Invoke specific action.
	 *
	 * @async
	 * @param {string} actionName - Name of action to invoke
	 * @param {array} params - Params associated with the action
	 * @return {Promise<string>} Data returned by bus.
	 */
	async invoke(actionName, params) {
		let action = null;

		// Invoked by user module
		if (typeof actionName === 'string') {
			action = new Action(actionName, params, this.moduleAlias);

			// Invoked by bus to preserve the source
		} else if (typeof actionName === 'object') {
			action = actionName;
		}

		if (action.module === this.moduleAlias) {
			return this.actionMap[action.key()](action);
		}

		return this.bus.invoke(action.serialize());
	}
};
