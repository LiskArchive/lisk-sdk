const { EventEmitter2 } = require('eventemitter2');
const axon = require('axon');
const { Server: RPCServer, Client: RPCClient } = require('axon-rpc');
const Action = require('../action');
const Event = require('../event');
const BaseChannel = require('./base_channel');

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

		process.once('SIGTERM', () => this.cleanup(1));
		process.once('SIGINT', () => this.cleanup(1));
		process.once('cleanup', (error, code) => this.cleanup(code, error));
		process.once('exit', (error, code) => this.cleanup(code, error));
	}

	async registerToBus(socketsPath) {
		this.rpcSocketPath = `${socketsPath.root}/${this.moduleAlias}_rpc.sock`;

		this.pubSocket = axon.socket('pub-emitter');
		this.pubSocket.connect(socketsPath.sub);

		this.subSocket = axon.socket('sub-emitter');
		this.subSocket.connect(socketsPath.pub);

		this.busRpcSocket = axon.socket('req');
		this.busRpcSocket.connect(socketsPath.rpc);
		this.busRpcClient = new RPCClient(this.busRpcSocket);

		this.rpcSocket = axon.socket('rep');
		this.rpcServer = new RPCServer(this.rpcSocket);

		this.rpcServer.expose('invoke', (action, cb) => {
			this.invoke(action)
				.then(data => cb(null, data))
				.catch(error => cb(error));
		});

		this.rpcSocket.bind(this.rpcSocketPath);

		return Promise.race([
			this._resolveWhenAllSucceed(),
			this._rejectWhenFirstFails(),
			// Timeout is needed here in case "bind" or "connect" events never arrive
			this._rejectWhenTimeout(2000), // TODO: Get value from config constant
		]);
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
			// TODO: make it `once` instead of `on`
			this.subSocket.on(eventName, data => {
				cb(data);
			});
		}
	}

	publish(eventName, data) {
		const event = new Event(eventName, data);

		if (event.module !== this.moduleAlias) {
			throw new Error(
				`Event "${eventName}" not registered in "${this.moduleAlias}" module.`
			);
		}

		this.localBus.emit(event.key(), event.serialize());
		this.pubSocket.emit(event.key(), event.serialize());
	}

	async invoke(actionName, params) {
		const action =
			typeof actionName === 'string'
				? new Action(actionName, params, this.moduleAlias)
				: actionName;

		if (
			action.module === this.moduleAlias &&
			typeof this.actions[action.name] === 'function'
		) {
			return this.actions[action.name](action);
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
	 * Close all sockets and perform cleanup operations
	 *
	 * @returns {Promise<void>}
	 */
	async cleanup() {
		if (this.rpcSocket && typeof this.rpcSocket.close === 'function') {
			this.rpcSocket.close();
		}
	}

	/**
	 * Wait for all sockets to bind and then resolve the main promise.
	 *
	 * @returns {Promise}
	 * @private
	 */
	async _resolveWhenAllSucceed() {
		return Promise.all([
			new Promise(resolve => {
				/*
				Here, the reason of calling .sock.once instead of pubSocket.once
				is that pubSocket interface by Axon doesn't expose the once method.
				However the actual socket does, by inheriting it from EventEmitter
				prototype
				 */
				this.pubSocket.sock.once('connect', () => {
					resolve();
				});
			}),
			new Promise(resolve => {
				this.subSocket.sock.once('connect', () => {
					resolve();
				});
			}),
			new Promise(resolve => {
				this.rpcSocket.once('bind', () => {
					resolve();
				});
			}),
			new Promise((resolve, reject) => {
				this.busRpcSocket.once('connect', () => {
					this.busRpcClient.call(
						'registerChannel',
						this.moduleAlias,
						this.eventsList.map(event => event.name),
						this.actionsList.map(action => action.name),
						{ type: 'ipcSocket', rpcSocketPath: this.rpcSocketPath },
						(err, result) => {
							if (err) reject(err);
							resolve(result);
						}
					);
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
	async _rejectWhenFirstFails() {
		return Promise.race([
			new Promise((_, reject) => {
				this.pubSocket.sock.once('error', () => {
					reject();
				});
			}),
			new Promise((_, reject) => {
				this.subSocket.sock.once('error', () => {
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
			setTimeout(async () => {
				// TODO: Review if logger.error might be useful.
				reject(new Error('ChildProcessChannel sockets setup timeout'));
			}, timeInMillis);
		});
	}
}

module.exports = ChildProcessChannel;
