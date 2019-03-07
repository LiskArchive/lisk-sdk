const { EventEmitter2 } = require('eventemitter2');
const axon = require('axon');
const { Server: RPCServer, Client: RPCClient } = require('axon-rpc');
const Action = require('../action');
const Event = require('../event');
const systemDirs = require('../config/dirs');
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
	}

	async connect(socketsPath) {
		this.pubSock = axon.socket('pub-emitter');
		this.pubSock.connect(socketsPath.sub);

		this.subSock = axon.socket('sub-emitter');
		this.subSock.connect(socketsPath.pub);

		this.busRpcSocket = axon.socket('req');
		this.busRpcSocket.connect(socketsPath.rpc);
		this.busRpcClient = new RPCClient(this.busRpcSocket);

		return new Promise((resolve, reject) => {
			// this.subSock.once('connect', resolve);
			// this.subSock.once('error', reject);

			// TODO: wait for all sockets to be created
			setTimeout(resolve, 1000);
		});
	}

	async registerToBus() {
		return new Promise((resolve, reject) => {
			this.busRpcClient.call(
				'registerChannel',
				this.moduleAlias,
				this.eventsList.map(event => event.name),
				this.actionsList.map(action => action.name),
				{},
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
			this.subSock.on(eventName, data => {
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
			this.subSock.on(eventName, data => {
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
		this.pubSock.emit(event.key(), event.serialize());
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
}

module.exports = ChildProcessChannel;
