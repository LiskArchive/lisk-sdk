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

class InMemoryChannel extends BaseChannel {
	constructor(moduleAlias, events, actions, options = {}) {
		super(moduleAlias, events, actions, options);
	}

	async registerToBus(bus) {
		this.bus = bus;
		await this.bus.registerChannel(
			this.moduleAlias,
			this.eventsList.map(event => event.name),
			this.actions,
			{ type: 'inMemory', channel: this },
		);
	}

	subscribe(eventName, cb) {
		this.bus.subscribe(new Event(eventName).key(), data =>
			setImmediate(cb, Event.deserialize(data)),
		);
	}

	once(eventName, cb) {
		this.bus.once(new Event(eventName).key(), data =>
			setImmediate(cb, Event.deserialize(data)),
		);
	}

	publish(eventName, data) {
		const event = new Event(eventName, data);

		if (event.module !== this.moduleAlias) {
			throw new Error(
				`Event "${eventName}" not registered in "${this.moduleAlias}" module.`,
			);
		}

		this.bus.publish(event.key(), event.serialize());
	}

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
