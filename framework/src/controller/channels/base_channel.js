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
const { INTERNAL_EVENTS, eventWithModuleNameReg } = require('./base/constants');

const _eventsList = new WeakMap();
const _actionsList = new WeakMap();
const _actions = new WeakMap();

/**
 * BaseChannel class which used as reference to implement others channels for bus to module communication
 *
 * @class
 * @memberof framework.controller.channels
 * @requires modules.Event
 * @requires modules.Action
 * @type {module.BaseChannel}
 */
class BaseChannel {
	/**
	 * Create the baseChannel object
	 *
	 * @param {string} moduleAlias - Label used for module
	 * @param {module.Event} events - Collection of events for event listener
	 * @param {module.Action} actions - Collection of actions available
	 * @param {Object} [options] - Options impacting events and actions list
	 * @param {boolean} [options.skipInternalEvents] - Skip internal events
	 *
	 * @throws Framework.errors.TypeError
	 */
	constructor(moduleAlias, events, actions, options = {}) {
		this.moduleAlias = moduleAlias;
		this.options = options;

		const eventList = options.skipInternalEvents
			? events
			: [...events, ...INTERNAL_EVENTS];

		_eventsList.set(
			this,
			eventList.map(eventName => new Event(`${this.moduleAlias}:${eventName}`)),
		);

		_actionsList.set(
			this,
			Object.keys(actions).map(
				actionName => new Action(`${this.moduleAlias}:${actionName}`),
			),
		);

		_actions.set(this, actions);
	}

	get actionsList() {
		return _actionsList.get(this);
	}

	get eventsList() {
		return _eventsList.get(this);
	}

	get actions() {
		return _actions.get(this);
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

	// Call action of any moduleAlias through controller
	// Specified as moduleName:actionName
	// eslint-disable-next-line no-unused-vars, class-methods-use-this
	async invoke(actionName, params) {
		throw new TypeError('This method must be implemented in child classes. ');
	}

	// Call action of any moduleAlias through controller
	// Specified as moduleName:actionName
	// Specified action must be defined as publicly callable
	// eslint-disable-next-line no-unused-vars, class-methods-use-this
	async invokePublic(actionName, params) {
		throw new TypeError('This method must be implemented in child classes. ');
	}

	isValidEventName(name, throwError = true) {
		const result = eventWithModuleNameReg.test(name);
		if (throwError && !result) {
			throw new Error(
				`[${this.moduleAlias.alias}] Invalid event name ${name}.`,
			);
		}
		return result;
	}

	isValidActionName(name, throwError = true) {
		const result = eventWithModuleNameReg.test(name);
		if (throwError && !result) {
			throw new Error(
				`[${this.moduleAlias.alias}] Invalid action name ${name}.`,
			);
		}
		return result;
	}
}

module.exports = BaseChannel;
