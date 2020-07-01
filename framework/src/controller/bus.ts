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

import * as axon from 'pm2-axon';
import {
	PubSocket,
	PullSocket,
	PushSocket,
	ReqSocket,
	SubSocket,
} from 'pm2-axon';
import { Client as RPCClient, Server as RPCServer } from 'pm2-axon-rpc';
import { EventEmitter2, Listener } from 'eventemitter2';
import { Action, ActionInfoObject, ActionsObject } from './action';
import { Logger } from '../application/logger';
import { BaseChannel } from './channels';
import { EventInfoObject, EventsArray } from './event';
import { SocketPaths } from './types';
import { IPCServer } from './ipc/ipc_server';

interface BusConfiguration {
	ipc: {
		readonly enabled: boolean;
	};
	socketsPath: SocketPaths;
}

interface RegisterChannelOptions {
	readonly type: string;
	readonly channel: BaseChannel;
	readonly rpcSocketPath?: string;
}

type NodeCallback = (error: Error | null, result?: unknown) => void;

enum ChannelType {
	InMemory,
	ChildProcess,
}

interface ChannelInfo {
	// TODO: Consolidate both channel and rpcClient
	//  For now in-memory channel will contain channel reference
	//  Child process channel will contain rpcClient
	readonly channel?: BaseChannel;
	readonly rpcClient?: RPCClient;
	readonly actions: {
		[key: string]: ActionInfoForBus;
	};
	readonly events: EventsArray;
	readonly type: ChannelType;
}

export interface ActionInfoForBus {
	readonly isPublic: boolean;
	readonly module: string;
	readonly name: string;
}

export class Bus {
	public logger: Logger;

	private readonly config: BusConfiguration;
	private readonly actions: {
		[key: string]: ActionInfoForBus;
	};
	private readonly events: { [key: string]: boolean };
	private readonly channels: {
		[key: string]: ChannelInfo;
	};
	private readonly rpcClients: { [key: string]: ReqSocket };
	private readonly _ipcServer: IPCServer;
	private readonly _emitter: EventEmitter2;

	public constructor(logger: Logger, config: BusConfiguration) {
		this.logger = logger;
		this.config = config;

		this._emitter = new EventEmitter2({
			wildcard: true,
			delimiter: ':',
			maxListeners: 1000,
		});

		// Hash map used instead of arrays for performance.
		this.actions = {};
		this.events = {};
		this.channels = {};
		this.rpcClients = {};

		this._ipcServer = new IPCServer({
			socketsDir: this.config.socketsPath.root,
			name: 'bus',
		});
	}

	public async setup(): Promise<boolean> {
		if (!this.config.ipc.enabled) {
			return true;
		}

		await this._ipcServer.start();

		this._rpcServer.expose(
			'registerChannel',
			(moduleAlias, events, actions, options, cb: NodeCallback) => {
				this.registerChannel(moduleAlias, events, actions, options)
					.then(() => cb(null))
					.catch(error => cb(error));
			},
		);

		this._rpcServer.expose('invoke', (action, cb: NodeCallback) => {
			this.invoke(action)
				.then(data => {
					cb(null, data);
				})
				.catch(error => {
					cb(error);
				});
		});

		this._rpcServer.expose('invokePublic', (action, cb: NodeCallback) => {
			this.invokePublic(action)
				.then(data => cb(null, data))
				.catch(error => cb(error));
		});

		this._subSocket.on(
			'message',
			(eventName: string, eventValue: EventInfoObject) => {
				this.publish(eventName, eventValue);
			},
		);

		return true;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async registerChannel(
		moduleAlias: string,
		// Events should also include the module alias
		events: EventsArray,
		actions: ActionsObject,
		options: RegisterChannelOptions,
	): Promise<void> {
		events.forEach(eventName => {
			if (this.events[`${moduleAlias}:${eventName}`] !== undefined) {
				throw new Error(`Event "${eventName}" already registered with bus.`);
			}
			this.events[`${moduleAlias}:${eventName}`] = true;
		});

		Object.keys(actions).forEach(actionName => {
			if (this.actions[`${moduleAlias}:${actionName}`] !== undefined) {
				throw new Error(`Action "${actionName}" already registered with bus.`);
			}

			this.actions[`${moduleAlias}:${actionName}`] = actions[actionName];
		});

		if (options.rpcSocketPath) {
			const rpcSocket = axon.socket('req') as ReqSocket;
			rpcSocket.connect(options.rpcSocketPath);

			const rpcClient = new RPCClient(rpcSocket);
			this.rpcClients[moduleAlias] = rpcSocket;

			this.channels[moduleAlias] = {
				rpcClient,
				events,
				actions,
				type: ChannelType.ChildProcess,
			};
		} else {
			this.channels[moduleAlias] = {
				channel: options.channel,
				events,
				actions,
				type: ChannelType.InMemory,
			};
		}
	}

	public async invoke<T>(actionData: string | ActionInfoObject): Promise<T> {
		const action = Action.deserialize(actionData);
		const actionFullName = action.key();
		const actionParams = action.params;

		if (this.actions[actionFullName] === undefined) {
			throw new Error(`Action '${action.key()}' is not registered to bus.`);
		}

		const channelInfo = this.channels[action.module];
		if (channelInfo.type === ChannelType.InMemory) {
			return (channelInfo.channel as BaseChannel).invoke<T>(
				actionFullName,
				actionParams,
			);
		}

		// For child process channel
		return new Promise((resolve, reject) => {
			(channelInfo.rpcClient as RPCClient).call(
				'invoke',
				action.serialize(),
				(err: Error | undefined, data: T) => {
					if (err) {
						return reject(err);
					}

					return resolve(data);
				},
			);
		});
	}

	public async invokePublic<T>(
		actionData: string | ActionInfoObject,
	): Promise<T> {
		const action = Action.deserialize(actionData);

		// Check if action exists
		if (this.actions[action.key()] === undefined) {
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

	public publish(eventName: string, eventValue: object): void {
		if (!this.getEvents().includes(eventName)) {
			throw new Error(`Event ${eventName} is not registered to bus.`);
		}
		// Communicate through event emitter
		this._emitter.emit(eventName, eventValue);

		// Communicate through unix socket
		if (this.config.ipc.enabled) {
			this._pubSocket.send(eventName, eventValue);
		}
	}

	public subscribe(eventName: string, cb: Listener): void {
		if (!this.getEvents().includes(eventName)) {
			this.logger.info(
				`Event ${eventName} was subscribed but not registered to the bus yet.`,
			);
		}

		// Communicate through event emitter
		this._emitter.on(eventName, cb);

		// // Communicate through unix socket
		// if (this.config.ipc.enabled) {
		// 	this._ipcServer.on(eventName, cb);
		// }
	}

	public once(eventName: string, cb: Listener): this {
		if (!this.getEvents().includes(eventName)) {
			this.logger.info(
				`Event ${eventName} was subscribed but not registered to the bus yet.`,
			);
		}

		// Communicate through event emitter
		this._emitter.once(eventName, cb);

		return this;
	}

	public getActions(): ReadonlyArray<string> {
		return Object.keys(this.actions);
	}

	public getEvents(): ReadonlyArray<string> {
		return Object.keys(this.events);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async cleanup(): Promise<void> {
		this._ipcServer.stop();
	}

	private get _rpcServer(): RPCServer {
		return this._ipcServer.rpcServer;
	}

	private get _pubSocket(): PubSocket | PushSocket {
		return this._ipcServer.pubSocket;
	}

	private get _subSocket(): PullSocket | SubSocket {
		return this._ipcServer.subSocket;
	}
}
