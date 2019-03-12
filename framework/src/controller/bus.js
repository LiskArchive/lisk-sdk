const axon = require('axon');
const { Server: RPCServer, Client: RPCClient } = require('axon-rpc');
const { EventEmitter2 } = require('eventemitter2');
const Action = require('./action');

const CONTROLLER_IDENTIFIER = 'lisk';

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
	constructor(options) {
		super(options);

		// Hash map used instead of arrays for performance.
		this.actions = {};
		this.events = {};
		this.channels = {};
	}

	/**
	 * Placeholder function.
	 *
	 * @async
	 * @return {Promise.<void>}
	 */
	async setup(socketsPath) {
		this.pubSocket = axon.socket('pub-emitter');
		this.pubSocket.bind(socketsPath.pub);

		this.subSocket = axon.socket('sub-emitter');
		this.subSocket.bind(socketsPath.sub);

		this.rpcSocket = axon.socket('rep');
		this.rpcServer = new RPCServer(this.rpcSocket);

		this.rpcServer.expose(
			'registerChannel',
			(moduleAlias, events, actions, options, cb) => {
				this.registerChannel(moduleAlias, events, actions, options)
					.then(() => setImmediate(cb, null))
					.catch(error => setImmediate(cb, error));
			}
		);

		this.rpcServer.expose('invoke', (action, cb) => {
			this.invoke(action)
				.then(data => setImmediate(cb, null, data))
				.catch(error => setImmediate(cb, error));
		});

		return new Promise((resolve, reject) => {
			// TODO: wait for all sockets to be created
			this.rpcSocket.once('bind', resolve);
			this.rpcSocket.once('error', reject);
			this.rpcSocket.bind(socketsPath.rpc);
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
	// eslint-disable-next-line no-unused-vars
	async registerChannel(
		moduleAlias,
		events,
		actions,
		options = { type: 'inMemory' }
	) {
		events.forEach(eventName => {
			const eventFullName = `${moduleAlias}:${eventName}`;
			if (this.events[eventFullName]) {
				throw new Error(
					`Event "${eventFullName}" already registered with bus.`
				);
			}
			this.events[eventFullName] = true;
		});

		actions.forEach(actionName => {
			const actionFullName = `${moduleAlias}:${actionName}`;
			if (this.actions[actionFullName]) {
				throw new Error(
					`Action "${actionFullName}" already registered with bus.`
				);
			}
			this.actions[actionFullName] = true;
		});

		let channel;
		if (options.type === 'inMemory') {
			channel = options.channel;
		} else {
			const rpcSocket = axon.socket('req');
			rpcSocket.connect(options.rpcSocketPath);
			channel = new RPCClient(rpcSocket);
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
	invoke(actionData) {
		const action = Action.deserialize(actionData);

		if (!this.actions[action.key()]) {
			throw new Error(`Action ${action.key()} is not registered to bus.`);
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
						return setImmediate(reject, err);
					}
					return setImmediate(resolve, data);
				}
			);
		});
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

		super.emit(eventName, eventValue); // Communicate throw event emitter
		this.pubSocket.emit(eventName, eventValue); // Communicate throw unix socket
	}

	subscribe(eventName, cb) {
		if (!this.getEvents().includes(eventName)) {
			throw new Error(`Event ${eventName} is not registered to bus.`);
		}

		super.on(eventName, cb); // Communicate throw event emitter
		this.subSocket.on(eventName, cb); // Communicate throw unix socket
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

	async cleanup() {
		if (this.pubSocket && typeof this.pubSocket.close === 'function') {
			this.pubSocket.close();
		}
		if (this.subSocket && typeof this.subSocket.close === 'function') {
			this.subSocket.close();
		}
		if (this.rpcSocket && typeof this.rpcSocket.close === 'function') {
			this.rpcSocket.close();
		}
	}
}

module.exports = Bus;
