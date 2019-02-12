const Event = require('../event');
const Action = require('../action');
const BaseChannel = require('./base');

/**
 * Channel responsible to communicate with bus for modules running in same process
 *
 * @namespace Framework.channels
 * @type {module.EventEmitterChannel}
 */
module.exports = class EventEmitterChannel extends BaseChannel {
	constructor(moduleAlias, events, actions, bus, options = {}) {
		super(moduleAlias, events, actions, options);
		this.bus = bus;
		this.actionMap = {};
	}

	async registerToBus() {
		await this.bus.registerChannel(
			this.moduleAlias,
			this.getEvents().map(e => e.name),
			this.getActions().map(a => a.name),
			{}
		);
	}

	subscribe(eventName, cb) {
		this.bus.on(new Event(eventName).key(), data =>
			setImmediate(cb, Event.deserialize(data))
		);
	}

	once(eventName, cb) {
		this.bus.once(new Event(eventName).key(), data =>
			setImmediate(cb, Event.deserialize(data))
		);
	}

	publish(eventName, data) {
		const event = new Event(eventName, data, this.moduleAlias);

		this.bus.emit(event.key(), event.serialize());
	}

	action(actionName, cb) {
		const action = new Action(`${this.moduleAlias}:${actionName}`, null, null);
		this.actionMap[action.key()] = cb;
	}

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
