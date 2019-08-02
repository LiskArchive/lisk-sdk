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

const { EventEmitter2 } = require('eventemitter2');
const axon = require('pm2-axon');
const { Server: RPCServer, Client: RPCClient } = require('pm2-axon-rpc');
const util = require('util');
const Action = require('../action');
const Event = require('../event');
const BaseChannel = require('./base_channel');
const { setupProcessHandlers } = require('./child_process');

const SOCKET_TIMEOUT_TIME = 2000;

/**
 * Channel responsible to communicate with bus for modules running in child process
 *
 * @class
 * @memberof framework.controller.channels
 * @requires module.Event
 * @requires module.Action
 * @requires channels/base_channel
 * @type {module.ChildProcessChannel}
 */
class ChildProcessChannel extends BaseChannel {
	constructor(moduleAlias, events, actions, options = {}) {
		super(moduleAlias, events, actions, options);
		this.localBus = new EventEmitter2();

		setupProcessHandlers(this);
	}

	async registerToBus(socketsPath) {
		this.subSocket = axon.socket('sub-emitter');
		this.subSocket.connect(socketsPath.pub);

		this.busRpcSocket = axon.socket('req');
		this.busRpcSocket.connect(socketsPath.rpc);
		this.busRpcClient = new RPCClient(this.busRpcSocket);
		this.busRpcClientCallPromisified = util.promisify(this.busRpcClient.call);

		// Channel Publish Socket is only required if the module has events
		if (this.eventsList.length > 0) {
			this.pubSocket = axon.socket('pub-emitter');
			this.pubSocket.connect(socketsPath.sub);
		}

		// Channel RPC Server is only required if the module has actions
		if (this.actionsList.length > 0) {
			this.rpcSocketPath = `unix://${socketsPath.root}/${
				this.moduleAlias
			}_rpc.sock`;

			this.rpcSocket = axon.socket('rep');
			this.rpcSocket.bind(this.rpcSocketPath);
			this.rpcServer = new RPCServer(this.rpcSocket);

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
		}

		return this.setupSockets();
	}

	setupSockets() {
		return Promise.race([
			this._resolveWhenAllSocketsBound(),
			this._rejectWhenAnySocketFailsToBind(),
			this._rejectWhenTimeout(SOCKET_TIMEOUT_TIME),
		]).finally(() => {
			this._removeAllListeners();
		});
	}

	subscribe(eventName, cb) {
		const event = new Event(eventName);

		if (event.module === this.moduleAlias) {
			this.localBus.on(eventName, cb);
		} else {
			this.subSocket.on(eventName, data => {
				cb(data);
			});
		}
	}

	once(eventName, cb) {
		const event = new Event(eventName);

		if (event.module === this.moduleAlias) {
			this.localBus.once(eventName, cb);
		} else {
			this.subSocket.on(eventName, data => {
				this.subSocket.off(eventName);
				cb(data);
			});
		}
	}

	publish(eventName, data) {
		const event = new Event(eventName, data);

		if (event.module !== this.moduleAlias) {
			throw new Error(
				`Event "${eventName}" not registered in "${this.moduleAlias}" module.`,
			);
		}

		this.localBus.emit(event.key(), event.serialize());

		if (this.pubSocket) {
			this.pubSocket.emit(event.key(), event.serialize());
		}
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
			return this.actions[action.name].handler(action);
		}

		return new Promise((resolve, reject) => {
			this.busRpcClient.call('invoke', action.serialize(), (err, data) => {
				if (err) {
					return reject(err);
				}

				return resolve(data);
			});
		});
	}

	/**
	 * Invoke specific public defined action.
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
					`Action ${action.name} is not allowed because it's not public.`,
				);
			}

			return this.actions[action.name].handler(action);
		}

		return new Promise((resolve, reject) => {
			this.busRpcClient.call(
				'invokePublic',
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
		if (this.busRpcSocket) {
			this.busRpcSocket.close();
		}
	}

	/**
	 * Wait for all sockets to bind and then resolve the main promise.
	 *
	 * @returns {Promise}
	 * @private
	 */
	async _resolveWhenAllSocketsBound() {
		const promises = [];

		if (this.pubSocket) {
			promises.push(
				new Promise(resolve => {
					this.pubSocket.sock.once('connect', () => {
						resolve();
					});
				}),
			);
		}

		if (this.subSocket) {
			promises.push(
				new Promise(resolve => {
					this.subSocket.sock.once('connect', () => {
						resolve();
					});
				}),
			);
		}

		if (this.rpcSocket) {
			promises.push(
				new Promise(resolve => {
					this.rpcSocket.once('bind', () => {
						resolve();
					});
				}),
			);
		}

		if (this.busRpcSocket && this.busRpcClient) {
			promises.push(
				new Promise((resolve, reject) => {
					this.busRpcSocket.once('connect', () => {
						this.busRpcClient.call(
							'registerChannel',
							this.moduleAlias,
							this.eventsList.map(event => event.name),
							this.actionsList.map(action => action.name),
							{ type: 'ipcSocket', rpcSocketPath: this.rpcSocketPath },
							(err, result) => {
								if (err) {
									reject(err);
								}
								resolve(result);
							},
						);
					});
				}),
			);
		}

		return Promise.all(promises);
	}

	/**
	 * Reject if any of the sockets fails to bind
	 *
	 * @returns {Promise}
	 * @private
	 */
	async _rejectWhenAnySocketFailsToBind() {
		const promises = [];

		if (this.pubSocket) {
			promises.push(
				new Promise((_, reject) => {
					this.pubSocket.sock.once('error', err => {
						reject(err);
					});
				}),
			);
		}

		if (this.subSocket) {
			promises.push(
				new Promise((_, reject) => {
					this.subSocket.sock.once('error', err => {
						reject(err);
					});
				}),
			);
		}

		if (this.rpcSocket) {
			promises.push(
				new Promise((_, reject) => {
					this.rpcSocket.once('error', err => {
						reject(err);
					});
				}),
			);
		}

		return Promise.race(promises);
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
			setTimeout(async () => {
				reject(new Error('ChildProcessChannel sockets setup timeout'));
			}, timeInMillis);
		});
	}

	/**
	 * Remove all listeners from all sockets
	 * @private
	 */
	_removeAllListeners() {
		if (this.subSocket) {
			this.subSocket.sock.removeAllListeners('connect');
			this.subSocket.sock.removeAllListeners('error');
		}

		if (this.pubSocket) {
			this.pubSocket.sock.removeAllListeners('connect');
			this.pubSocket.sock.removeAllListeners('error');
		}

		if (this.busRpcSocket) {
			this.busRpcSocket.removeAllListeners('connect');
			this.busRpcSocket.removeAllListeners('error');
		}

		if (this.rpcSocket) {
			this.rpcSocket.removeAllListeners('bind');
			this.rpcSocket.removeAllListeners('error');
		}
	}
}

module.exports = ChildProcessChannel;
