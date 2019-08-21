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

const axon = require('pm2-axon');
const { Server: RPCServer, Client: RPCClient } = require('pm2-axon-rpc');
const { EventEmitter2 } = require('eventemitter2');
const Action = require('./action');

const CONTROLLER_IDENTIFIER = 'app';
const SOCKET_TIMEOUT_TIME = 2000;

/**
 * Bus responsible to maintain communication between modules
 *
 * @class
 * @memberof framework.controller
 * @requires bluebird
 * @requires eventemitter2
 * @requires module.Action
 */
class Bus extends EventEmitter2 {
	/**
	 * Create the bus object
	 *
	 * @param {Object} controller - Controller object
	 * @param {Object} options - EventEmitter2 native options object
	 * @see {@link https://github.com/EventEmitter2/EventEmitter2/blob/master/eventemitter2.d.ts|String}
	 */
	constructor(options, logger, config) {
		super(options);
		this.logger = logger;
		this.config = config;

		// Hash map used instead of arrays for performance.
		this.actions = {};
		this.events = {};
		this.channels = {};
		this.rpcClients = {};
	}

	/**
	 * Placeholder function.
	 *
	 * @async
	 * @return {Promise.<void>}
	 */
	async setup() {
		if (!this.config.ipc.enabled) {
			return true;
		}

		this.pubSocket = axon.socket('pub-emitter');
		this.pubSocket.bind(this.config.socketsPath.pub);

		this.subSocket = axon.socket('sub-emitter');
		this.subSocket.bind(this.config.socketsPath.sub);

		this.rpcSocket = axon.socket('rep');
		this.rpcServer = new RPCServer(this.rpcSocket);
		this.rpcSocket.bind(this.config.socketsPath.rpc);

		this.rpcServer.expose(
			'registerChannel',
			(moduleAlias, events, actions, options, cb) => {
				this.registerChannel(moduleAlias, events, actions, options)
					.then(() => cb(null))
					.catch(error => cb(error));
			},
		);

		this.rpcServer.expose('invoke', (action, cb) => {
			this.invoke(action)
				.then(data => cb(null, data))
				.catch(error => cb(error));
		});

		this.rpcServer.expose('invokePublic', (action, cb) => {
			this.invokePublic(action)
				.then(data => cb(null, data))
				.catch(error => cb(error));
		});

		return Promise.race([
			this._resolveWhenAllSocketsBound(),
			this._rejectWhenAnySocketFailsToBind(),
			this._rejectWhenTimeout(SOCKET_TIMEOUT_TIME),
		]).finally(() => {
			this._removeAllListeners();
		});
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
	async registerChannel(
		moduleAlias,
		events,
		actions,
		options = { type: 'inMemory' },
	) {
		events.forEach(eventName => {
			const eventFullName = `${moduleAlias}:${eventName}`;
			if (this.events[eventFullName]) {
				throw new Error(
					`Event "${eventFullName}" already registered with bus.`,
				);
			}
			this.events[eventFullName] = true;
		});

		Object.keys(actions).forEach(actionName => {
			const actionFullName = `${moduleAlias}:${actionName}`;

			if (this.actions[actionFullName]) {
				throw new Error(
					`Action "${actionFullName}" already registered with bus.`,
				);
			}

			this.actions[actionFullName] = actions[actionName];
		});

		let { channel } = options;

		if (options.rpcSocketPath) {
			const rpcSocket = axon.socket('req');
			rpcSocket.connect(options.rpcSocketPath);
			channel = new RPCClient(rpcSocket);
			this.rpcClients[moduleAlias] = rpcSocket;
		}

		this.channels[moduleAlias] = {
			channel,
			actions,
			events,
			type: options.type,
		};
	}

	/**
	 * Invoke action on bus.
	 *
	 * @param {Object|string} actionData - Object or stringified object containing action data like name, module, souce, and params.
	 *
	 * @throws {Error} If action is not registered to bus.
	 */
	async invoke(actionData) {
		const action = Action.deserialize(actionData);

		if (!this.actions[action.key()]) {
			throw new Error(`Action '${action.key()}' is not registered to bus.`);
		}

		if (action.module === CONTROLLER_IDENTIFIER) {
			return this.channels[CONTROLLER_IDENTIFIER].channel.invoke(action);
		}

		if (this.channels[action.module].type === 'inMemory') {
			return this.channels[action.module].channel.invoke(action);
		}

		return new Promise((resolve, reject) => {
			this.channels[action.module].channel.call(
				'invoke',
				action.serialize(),
				(err, data) => {
					if (err) {
						return reject(err);
					}
					return resolve(data);
				},
			);
		});
	}

	/**
	 * Invoke public defined action on bus.
	 *
	 * @param {Object|string} actionData - Object or stringified object containing action data like name, module, souce, and params.
	 *
	 * @throws {Error} If action is not registered to bus.
	 */
	async invokePublic(actionData) {
		const action = Action.deserialize(actionData);

		// Check if action exists
		if (!this.actions[action.key()]) {
			throw new Error(`Action '${action.key()}' is not registered to bus.`);
		}

		// Check if action is public
		if (!this.actions[action.key()].isPublic) {
			throw new Error(
				`Action '${action.key()}' is not allowed because it's not public.`,
			);
		}

		return this.invoke(actionData);
	}

	/**
	 * Emit event with its data on bus.
	 *
	 * @param {string} eventName - Name of the event
	 * @param {string} eventValue - Attached value for event
	 *
	 * @throws {Error} If event name does not exist to bus.
	 */
	publish(eventName, eventValue) {
		if (!this.getEvents().includes(eventName)) {
			throw new Error(`Event ${eventName} is not registered to bus.`);
		}
		// Communicate through event emitter
		this.emit(eventName, eventValue);

		// Communicate through unix socket
		if (this.config.ipc.enabled) {
			this.pubSocket.emit(eventName, eventValue);
		}
	}

	subscribe(eventName, cb) {
		if (!this.getEvents().includes(eventName)) {
			this.logger.info(
				`Event ${eventName} was subscribed but not registered to the bus yet.`,
			);
		}

		// Communicate through event emitter
		this.on(eventName, cb);

		// Communicate through unix socket
		if (this.config.ipc.enabled) {
			this.subSocket.on(eventName, cb);
		}
	}

	once(eventName, cb) {
		if (!this.getEvents().includes(eventName)) {
			this.logger.info(
				`Event ${eventName} was subscribed but not registered to the bus yet.`,
			);
		}

		// Communicate through event emitter
		super.once(eventName, cb);

		// TODO: make it `once` instead of `on`
		// Communicate through unix socket
		if (this.config.ipc.enabled) {
			this.subSocket.on(eventName, cb);
		}
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

	/**
	 * Close all sockets and perform cleanup operations
	 *
	 * @returns {Promise<void>}
	 */
	async cleanup() {
		if (this.pubSocket) {
			this.pubSocket.close();
		}
		if (this.subSocket) {
			this.subSocket.close();
		}
		if (this.rpcSocket) {
			this.rpcSocket.close();
		}
	}

	/**
	 * Wait for all sockets to bind and then resolve the main promise.
	 *
	 * @returns {Promise}
	 * @private
	 */
	async _resolveWhenAllSocketsBound() {
		return Promise.all([
			new Promise(resolve => {
				/*
				Here, the reason of calling .sock.once instead of pubSocket.once
				is that pubSocket interface by Axon doesn't expose the once method.
				However the actual socket does, by inheriting it from EventEmitter
				prototype
				 */
				this.subSocket.sock.once('bind', () => {
					resolve();
				});
			}),
			new Promise(resolve => {
				this.pubSocket.sock.once('bind', () => {
					resolve();
				});
			}),
			new Promise(resolve => {
				this.rpcSocket.once('bind', () => {
					resolve();
				});
			}),
		]);
	}

	/**
	 * Reject if any of the sockets fails to bind
	 *
	 * @returns {Promise}
	 * @private
	 */
	async _rejectWhenAnySocketFailsToBind() {
		return Promise.race([
			new Promise((_, reject) => {
				this.subSocket.sock.once('error', () => {
					reject();
				});
			}),
			new Promise((_, reject) => {
				this.pubSocket.sock.once('error', () => {
					reject();
				});
			}),
			new Promise((_, reject) => {
				this.rpcSocket.once('error', () => {
					reject();
				});
			}),
		]);
	}

	/**
	 * Reject if time out
	 *
	 * @param {number} timeInMillis
	 * @returns {Promise}
	 * @private
	 */
	// eslint-disable-next-line class-methods-use-this
	async _rejectWhenTimeout(timeInMillis) {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error('Bus sockets setup timeout'));
			}, timeInMillis);
		});
	}

	_removeAllListeners() {
		this.subSocket.sock.removeAllListeners('bind');
		this.subSocket.sock.removeAllListeners('error');
		this.pubSocket.sock.removeAllListeners('bind');
		this.pubSocket.sock.removeAllListeners('error');
		this.rpcSocket.removeAllListeners('bind');
		this.rpcSocket.removeAllListeners('error');
	}
}

module.exports = Bus;
