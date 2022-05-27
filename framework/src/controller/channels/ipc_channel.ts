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
import { Request } from '../request';
import { Event } from '../event';
import { BaseChannel } from './base_channel';
import { IPCClient } from '../ipc/ipc_client';
import { EndpointInfo, ChannelType, EndpointHandlers } from '../../types';
import * as JSONRPC from '../jsonrpc';
import { IPC_EVENTS } from '../constants';
import { Logger } from '../../logger';

interface ChildProcessOptions {
	socketsPath: string;
}

export class IPCChannel extends BaseChannel {
	private readonly _emitter: EventEmitter2;
	private readonly _ipcClient: IPCClient;
	private readonly _rpcRequestIds: Set<string>;

	public constructor(
		logger: Logger,
		namespace: string,
		events: ReadonlyArray<string>,
		endpoints: EndpointHandlers,
		options: ChildProcessOptions,
	) {
		super(logger, namespace, events, endpoints);

		this._ipcClient = new IPCClient({
			socketsDir: options.socketsPath,
			name: namespace,
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
		this._subSocket.subscribe(IPC_EVENTS.RPC_EVENT);

		// Listen to events on sub socket
		const listenToMessages = async (): Promise<void> => {
			for await (const [_event, eventData] of this._subSocket) {
				// Listen to events and emit on local emitter

				const eventDataJSON = Event.fromJSONRPCNotification(JSON.parse(eventData.toString()));
				this._emitter.emit(eventDataJSON.key(), eventDataJSON.toJSONRPCNotification());
			}
		};
		listenToMessages().catch(error => {
			throw error;
		});

		// Handle RPC requests coming from Bus on rpc server
		const listenToRPC = async (): Promise<void> => {
			for await (const [sender, event, eventData] of this._rpcServer) {
				if (event.toString() === IPC_EVENTS.RPC_EVENT) {
					const request = Request.fromJSONRPCRequest(JSON.parse(eventData.toString()));
					if (request.namespace === this.namespace) {
						this.invoke(request.key(), request.params)
							.then(result => {
								this._rpcServer
									.send([
										sender,
										request.id as string,
										JSON.stringify(request.buildJSONRPCResponse({ result })),
									])
									.catch(error => {
										throw error;
									});
							})
							.catch(error => {
								throw error;
							});
					}
					continue;
				}
			}
		};
		listenToRPC().catch(error => {
			throw error;
		});

		// Handle RPC requests responses coming back from Bus on rpc client
		const listenToRPCResponse = async (): Promise<void> => {
			for await (const [requestId, result] of this._rpcClient) {
				if (this._rpcRequestIds.has(requestId.toString())) {
					this._emitter.emit(requestId.toString(), JSON.parse(result.toString()));
					continue;
				}
			}
		};
		listenToRPCResponse().catch(error => {
			throw error;
		});
	}

	public async registerToBus(): Promise<void> {
		await this.startAndListen();
		// Register channel details
		let endpointInfo: { [key: string]: EndpointInfo } = {};
		endpointInfo = Object.keys(this.endpointHandlers).reduce((accumulator, value: string) => {
			accumulator[value] = {
				method: value,
				namespace: this.namespace,
			};
			return accumulator;
		}, endpointInfo);

		const registerObj = {
			moduleName: this.namespace,
			eventsList: this.eventsList.map((event: string) => event),
			endpointInfo,
			options: {
				type: ChannelType.ChildProcess,
				socketPath: this._ipcClient.socketPaths.rpcServer,
			},
		};

		this._rpcClient
			.send([IPC_EVENTS.REGISTER_CHANNEL, JSON.stringify(registerObj)])
			.catch(error => {
				throw error;
			});
	}

	public subscribe(eventName: string, cb: ListenerFn): void {
		const event = new Event(eventName);
		this._subSocket.subscribe(eventName);
		this._emitter.on(event.key(), (notification: JSONRPC.NotificationRequest) =>
			// When IPC channel used without bus the data will not contain result
			setImmediate(cb, Event.fromJSONRPCNotification(notification).data),
		);
	}

	public unsubscribe(eventName: string, cb: ListenerFn): void {
		this._subSocket.unsubscribe(eventName);
		this._emitter.off(eventName, cb);
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
		if (event.module !== this.namespace || !this.eventsList.includes(event.name)) {
			throw new Error(`Event "${eventName}" not registered in "${this.namespace}" module.`);
		}

		this._pubSocket
			.send([event.key(), JSON.stringify(event.toJSONRPCNotification())])
			.catch(error => {
				throw error;
			});
	}

	public async invoke<T>(methodName: string, params?: Record<string, unknown>): Promise<T> {
		const request = new Request(this._getNextRequestId(), methodName, params);

		// When the handler is within the same channel
		if (request.namespace === this.namespace) {
			const handler = this.endpointHandlers[request.name];
			if (!handler) {
				throw new Error('Handler does not exist.');
			}

			return handler({
				getStore: () => {
					throw new Error('getStore cannot be called on IPC channel');
				},
				getImmutableAPIContext: () => {
					throw new Error('getImmutableAPIContext cannot be called on IPC channel');
				},
				params: request.params ?? {},
				logger: this._logger,
			}) as Promise<T>;
		}

		// When the handler is in other channels
		return new Promise((resolve, reject) => {
			this._rpcRequestIds.add(request.id as string);
			this._rpcClient
				.send(['invoke', JSON.stringify(request.toJSONRPCRequest())])
				.then(_ => {
					const requestTimeout = setTimeout(() => {
						reject(new Error('Request timed out on invoke.'));
					}, IPC_EVENTS.RPC_REQUEST_TIMEOUT);
					this._emitter.once(
						request.id as string,
						(response: JSONRPC.ResponseObjectWithResult<T>) => {
							clearTimeout(requestTimeout);
							this._rpcRequestIds.delete(request.id as string);
							return resolve(response.result);
						},
					);
				})
				.catch(error => {
					throw error;
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
