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

	async registerBus(socketsPath) {
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
				.then(data => setImmediate(cb, null, data))
				.catch(error => setImmediate(cb, error));
		});

		this.rpcSocket.bind(this.rpcSocketPath);

		return new Promise((resolve, reject) => {
			this.busRpcClient.call(
				'registerChannel',
				this.moduleAlias,
				this.eventsList.map(event => event.name),
				this.actionsList.map(action => action.name),
				{ type: 'ipcSocket', rpcSocketPath: this.rpcSocketPath },
				(err, result) => {
					if (err) return reject(err);
					return resolve(result);
				}
			);
		});
	}

	subscribe(eventName, cb) {
		const event = new Event(eventName);

		if (event.module === this.moduleAlias) {
			this.localBus.on(eventName, cb);
		} else {
			this.subSocket.on(eventName, data => {
				setImmediate(cb, data);
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
				setImmediate(cb, data);
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
					return setImmediate(reject, err);
				}

				return setImmediate(resolve, data);
			});
		});
	}

	async cleanup() {
		if (this.rpcSocket && typeof this.rpcSocket.close === 'function') {
			this.rpcSocket.close();
		}
	}
}

module.exports = ChildProcessChannel;
