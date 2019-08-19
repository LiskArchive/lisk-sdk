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

const Event = require('../event');
const Action = require('../action');
const BaseChannel = require('./base_channel');

/**
 * Channel responsible to communicate with bus for modules running in same process
 *
 * @class
 * @memberof framework.controller.channels
 * @requires module.Event
 * @requires module.Action
 * @requires channels/base_channel
 * @type {module.InMemoryChannel}
 */
class InMemoryChannel extends BaseChannel {
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
	constructor(moduleAlias, events, actions, options = {}) {
		super(moduleAlias, events, actions, options);
	}

	/**
	 * Register new channel on bus.
	 *
	 * @async
	 */
	async registerToBus(bus) {
		this.bus = bus;
		await this.bus.registerChannel(
			this.moduleAlias,
			this.eventsList.map(event => event.name),
			this.actions,
			{ type: 'inMemory', channel: this },
		);
	}

	/**
	 * Subscribe for a specific event.
	 *
	 * @param {string} eventName - Name of event to subscribe on
	 * @returns {setImmediateCallback} cb, err, self - The callback that handles events
	 */
	subscribe(eventName, cb) {
		this.bus.subscribe(new Event(eventName).key(), data =>
			setImmediate(cb, Event.deserialize(data)),
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
			setImmediate(cb, Event.deserialize(data)),
		);
	}

	/**
	 * Adds a listener to the end of the listeners array for the specified event.
	 *
	 * @param {string} eventName - Name of event to subscribe on
	 * @param {Object} data - Data to publish with event
	 */
	publish(eventName, data) {
		const event = new Event(eventName, data);

		if (event.module !== this.moduleAlias) {
			throw new Error(
				`Event "${eventName}" not registered in "${this.moduleAlias}" module.`,
			);
		}

		this.bus.publish(event.key(), event.serialize());
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
		const action =
			typeof actionName === 'string'
				? new Action(actionName, params, this.moduleAlias)
				: actionName;

		if (action.module === this.moduleAlias) {
			if (!this.actions[action.name]) {
				throw new Error(
					`The action '${action.name}' on module '${
						this.moduleAlias
					}' does not exist.`,
				);
			}
			return this.actions[action.name].handler(action);
		}

		return this.bus.invoke(action.serialize());
	}

	/**
	 * Invoke specific public action.
	 *
	 * @async
	 * @param {string} actionName - Name of action to invoke
	 * @param {array} params - Params associated with the action
	 * @return {Promise<string>} Data returned by bus.
	 */
	async invokePublic(actionName, params) {
		const action =
			typeof actionName === 'string'
				? new Action(actionName, params, this.moduleAlias)
				: actionName;

		if (action.module === this.moduleAlias) {
			if (!this.actions[action.name].isPublic) {
				throw new Error(
					`Action '${action.name}' is not allowed because it's not public.`,
				);
			}

			return this.actions[action.name].handler(action);
		}

		return this.bus.invokePublic(action.serialize());
	}
}

module.exports = InMemoryChannel;
