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
import { PubSocket, PullSocket, PushSocket, ReqSocket, SubSocket } from 'pm2-axon';
import { Client as RPCClient, Server as RPCServer } from 'pm2-axon-rpc';
import { EventEmitter2, Listener } from 'eventemitter2';
import { Action, ActionsObject } from './action';
import { Event, EventsArray } from './event';
import * as JSONRPC from './jsonrpc';
import { Logger } from '../logger';
import { BaseChannel } from './channels/base_channel';
import { IPCServer } from './ipc/ipc_server';
import { ActionInfoForBus, SocketPaths } from '../types';
import { WSServer } from './ws/ws_server';
import { ResponseObjectWithError, ResponseObjectWithResult } from './jsonrpc';

interface BusConfiguration {
	ipc: {
		readonly enabled: boolean;
	};
	socketsPath: SocketPaths;
	rpc: {
		readonly enable: boolean;
		readonly mode: string;
		readonly port: number;
	};
}

interface RegisterChannelOptions {
	readonly type: string;
	readonly channel: BaseChannel;
	readonly rpcSocketPath?: string;
}

type NodeCallback = (
	error: JSONRPC.ResponseObjectWithError | Error | null,
	result?: JSONRPC.ResponseObject,
) => void;

enum ChannelType {
	InMemory,
	ChildProcess,
}

interface ChannelInfo {
	readonly channel?: BaseChannel;
	readonly rpcClient?: RPCClient;
	readonly actions: {
		[key: string]: ActionInfoForBus;
	};
	readonly events: EventsArray;
	readonly type: ChannelType;
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

	private readonly _wsServer!: WSServer;

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

		if (this.config.rpc.enable && this.config.rpc.mode === 'ws') {
			this._wsServer = new WSServer({
				path: '/ws',
				port: config.rpc.port,
				logger: this.logger,
			});
			this._wsServer.start();
		}
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

		this._rpcServer.expose('invoke', (action: string | JSONRPC.RequestObject, cb: NodeCallback) => {
			this.invoke(action)
				.then(data => {
					cb(null, data as ResponseObjectWithResult);
				})
				.catch(error => {
					cb(error as ResponseObjectWithError);
				});
		});

		this._subSocket.on('message', (eventValue: string | JSONRPC.NotificationRequest) => {
			this.publish(eventValue);
		});

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

	public async invoke<T>(
		actionData: string | JSONRPC.RequestObject,
	): Promise<JSONRPC.ResponseObjectWithResult<T>> {
		const parsedAction = Action.fromJSONRPCRequest(actionData);

		try {
			JSONRPC.validateJSONRPCRequest(parsedAction.toJSONRPCRequest() as never);
		} catch (error) {
			// TODO: Improve the error by creating custom error constructor
			throw new Error(
				JSON.stringify(JSONRPC.errorResponse(parsedAction.id, JSONRPC.invalidRequest())),
			);
		}

		const actionFullName = parsedAction.key();

		if (this.actions[actionFullName] === undefined) {
			throw new Error(`Action '${actionFullName}' is not registered to bus.`);
		}

		const actionParams = parsedAction.params;
		const channelInfo = this.channels[parsedAction.module];
		if (channelInfo.type === ChannelType.InMemory) {
			const result = await (channelInfo.channel as BaseChannel).invoke<T>(
				actionFullName,
				actionParams,
			);
			return parsedAction.buildJSONRPCResponse({
				result,
			}) as ResponseObjectWithResult<T>;
		}

		// For child process channel
		return new Promise((resolve, reject) => {
			(channelInfo.rpcClient as RPCClient).call(
				'invoke',
				parsedAction.toJSONRPCRequest(),
				(err: Error | undefined, data: JSONRPC.ResponseObjectWithResult<T>) => {
					if (err) {
						return reject(err);
					}

					return resolve(data);
				},
			);
		});
	}

	public publish(eventData: string | JSONRPC.NotificationRequest): void {
		const parsedEvent = Event.fromJSONRPCNotification(eventData);

		try {
			JSONRPC.validateJSONRPCRequest(parsedEvent.toJSONRPCNotification() as never);
		} catch (error) {
			throw JSONRPC.errorResponse(null, JSONRPC.invalidRequest());
		}

		const eventName = parsedEvent.key();
		const notification = parsedEvent.toJSONRPCNotification();

		if (!this.getEvents().includes(eventName)) {
			throw new Error(`Event ${eventName} is not registered to bus.`);
		}

		// Communicate through event emitter
		this._emitter.emit(eventName, notification);

		// Communicate through unix socket
		if (this.config.ipc.enabled) {
			try {
				this._pubSocket.send(notification);
			} catch (error) {
				this.logger.debug(
					{ err: error as Error },
					`Failed to publish event: ${eventName} to socket.`,
				);
			}
		}
	}

	public subscribe(eventName: string, cb: Listener): void {
		if (!this.getEvents().includes(eventName)) {
			this.logger.info(`Event ${eventName} was subscribed but not registered to the bus yet.`);
		}

		// Communicate through event emitter
		this._emitter.on(eventName, cb);
	}

	public once(eventName: string, cb: Listener): this {
		if (!this.getEvents().includes(eventName)) {
			this.logger.info(`Event ${eventName} was subscribed but not registered to the bus yet.`);
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
		this._emitter.removeAllListeners();
		this._ipcServer.stop();

		if (this._wsServer) {
			this._wsServer.stop();
		}
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
