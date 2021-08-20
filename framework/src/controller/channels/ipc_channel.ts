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

import { Dealer, Publisher, Router, Subscriber } from 'zeromq';
import { EventEmitter2, ListenerFn } from 'eventemitter2';
import { join } from 'path';
import { Action, ActionsDefinition } from '../action';
import { Event } from '../event';
import { BaseChannel, BaseChannelOptions } from './base_channel';
import { IPCClient } from '../ipc/ipc_client';
import { ActionInfoForBus, ChannelType } from '../../types';
import * as JSONRPC from '../jsonrpc';
import { IPC_RPC_EVENT, IPC_REGISTER_CHANNEL_EVENT } from '../constants';

interface ChildProcessOptions extends BaseChannelOptions {
	socketsPath: string;
}

export class IPCChannel extends BaseChannel {
	private readonly _emitter: EventEmitter2;
	private readonly _ipcClient: IPCClient;
	private readonly _rpcRequestIds: Set<string>;

	public constructor(
		moduleAlias: string,
		events: ReadonlyArray<string>,
		actions: ActionsDefinition,
		options: ChildProcessOptions,
	) {
		super(moduleAlias, events, actions, options);

		this._ipcClient = new IPCClient({
			socketsDir: options.socketsPath,
			name: moduleAlias,
			rpcServerSocketPath: `ipc://${join(options.socketsPath, 'bus.internal.rpc.ipc')}`,
		});

		this._rpcRequestIds = new Set();

		this._emitter = new EventEmitter2({
			wildcard: true,
			delimiter: ':',
			maxListeners: 1000,
		});
	}

	public async startAndListen(): Promise<void> {
		await this._ipcClient.start();
		// Subscribe to invoke to listen to RPC events
		this._subSocket.subscribe(IPC_RPC_EVENT);

		// Listen to events on sub socket
		const listenToMessages = async (): Promise<void> => {
			for await (const [_event, eventData] of this._subSocket) {
				// Listen to events and emit on local emitter

				const eventDataJSON = Event.fromJSONRPCNotification(JSON.parse(eventData.toString()));
				this._emitter.emit(eventDataJSON.key(), eventDataJSON.toJSONRPCNotification());
			}
		};
		listenToMessages();

		// Handle RPC requests coming from Bus on rpc server
		const listenToRPC = async (): Promise<void> => {
			for await (const [sender, event, eventData] of this._rpcServer) {
				if (event.toString() === IPC_RPC_EVENT) {
					const request = Action.fromJSONRPCRequest(JSON.parse(eventData.toString()));
					if (request.module === this.moduleAlias) {
						this.invoke(request.key(), request.params)
							.then(result => {
							this._rpcServer.send([
								sender,
								request.id as string,
								JSON.stringify(request.buildJSONRPCResponse({ result })),
							]);
						});
					}
					continue;
				}
			}
		};
		listenToRPC();

		// Handle RPC requests responses coming back from Bus on rpc client
		const listenToRPCResponse = async (): Promise<void> => {
			for await (const [requestId, result] of this._rpcClient) {
				if (this._rpcRequestIds.has(requestId.toString())) {
					this._emitter.emit(requestId.toString(), JSON.parse(result.toString()));
					continue;
				}
			}
		};
		listenToRPCResponse();
	}

	public async registerToBus(): Promise<void> {
		await this.startAndListen();
		// Register channel details
		let actionsInfo: { [key: string]: ActionInfoForBus } = {};
		actionsInfo = Object.keys(this.actions).reduce((accumulator, value: string) => {
			accumulator[value] = {
				name: value,
				module: this.moduleAlias,
			};
			return accumulator;
		}, actionsInfo);

		const registerObj = {
			moduleAlias: this.moduleAlias,
			eventsList: this.eventsList.map((event: string) => event),
			actionsInfo: actionsInfo,
			options: {
				type: ChannelType.ChildProcess,
				socketPath: this._ipcClient.socketPaths.rpcServer,
			},
		};

		this._rpcClient.send([IPC_REGISTER_CHANNEL_EVENT, JSON.stringify(registerObj)])
	}

	public subscribe(eventName: string, cb: ListenerFn): void {
		const event = new Event(eventName);
		this._subSocket.subscribe(eventName);
		this._emitter.on(event.key(), (notification: JSONRPC.NotificationRequest) =>
			// When IPC channel used without bus the data will not contain result
			setImmediate(cb, Event.fromJSONRPCNotification(notification).data),
		);
	}

	public once(eventName: string, cb: ListenerFn): void {
		const event = new Event(eventName);
		this._subSocket.subscribe(eventName);
		this._emitter.once(event.key(), (notification: JSONRPC.NotificationRequest) => {
			// When IPC channel used without bus the data will not contain result
			setImmediate(cb, Event.fromJSONRPCNotification(notification).data);
		});
	}

	public publish(eventName: string, data?: Record<string, unknown>): void {
		const event = new Event(eventName, data);
		if (event.module !== this.moduleAlias || !this.eventsList.includes(event.name)) {
			throw new Error(`Event "${eventName}" not registered in "${this.moduleAlias}" module.`);
		}

		this._pubSocket.send([event.name, JSON.stringify(event.toJSONRPCNotification())]);
	}

	public async invoke<T>(actionName: string, params?: Record<string, unknown>): Promise<T> {
		const action = new Action(this._getNextRequestId(), actionName, params);

		// When the handler is within the same channel
		if (action.module === this.moduleAlias) {
			const handler = this.actions[action.name]?.handler;
			if (!handler) {
				throw new Error('Handler does not exist.');
			}

			// change this to lisk format
			return handler(action.params) as T;
		}

		// When the handler is in other channels
		return new Promise(resolve => {
			// Subscribe to the action Id;
			this._rpcRequestIds.add(action.id as string);
			this._subSocket.subscribe(action.id as string);
			this._rpcClient.send(['invoke', JSON.stringify(action.toJSONRPCRequest())])
				.then(_ => {
					this._emitter.once(action.id as string, (response: JSONRPC.ResponseObjectWithResult<T>) => {
						// Unsubscribe action Id after its resolved
						this._subSocket.unsubscribe(action.id as string);
						this._rpcRequestIds.delete(action.id as string);
						return resolve(response.result);
					});
				});
		});
	}

	public cleanup(_status?: number, _message?: string): void {
		this._ipcClient.stop();
	}

	private get _pubSocket(): Publisher {
		return this._ipcClient.pubSocket;
	}

	private get _subSocket(): Subscriber {
		return this._ipcClient.subSocket;
	}

	private get _rpcServer(): Router {
		return this._ipcClient.rpcServer;
	}

	private get _rpcClient(): Dealer {
		return this._ipcClient.rpcClient;
	}
}
