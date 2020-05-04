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

import { EventEmitter2 } from 'eventemitter2';
import * as axon from 'pm2-axon';
import { Server as RPCServer, Client as RPCClient, Client } from 'pm2-axon-rpc';
import * as util from 'util';
import {
	PubEmitterSocket,
	RepSocket,
	ReqSocket,
	SubEmitterSocket,
} from 'pm2-axon';
import { Action, ActionsDefinition } from '../action';
import { Event, EventCallback, EventInfoObject } from '../event';
import { BaseChannel, BaseChannelOptions } from './base_channel';
import { socketPathObject } from '../bus';

export const setupProcessHandlers = (channel: ChildProcessChannel): void => {
	process.once('SIGTERM', () => channel.cleanup(1));
	process.once('SIGINT', () => channel.cleanup(1));
	process.once('exit', code => channel.cleanup(code));
};

type NodeCallback = (error: Error | null, result?: number) => void;

const SOCKET_TIMEOUT_TIME = 2000;

export class ChildProcessChannel extends BaseChannel {
	public localBus: EventEmitter2;
	public subSocket?: SubEmitterSocket;
	public busRpcSocket?: ReqSocket;
	public busRpcClient?: Client;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public busRpcClientCallPromisified: any;
	public pubSocket?: PubEmitterSocket;
	public rpcSocketPath?: socketPathObject | string;
	public rpcSocket?: RepSocket;
	public rpcServer?: RPCServer;

	public constructor(
		moduleAlias: string,
		events: ReadonlyArray<string>,
		actions: ActionsDefinition,
		options: BaseChannelOptions = {},
	) {
		super(moduleAlias, events, actions, options);
		this.localBus = new EventEmitter2();

		setupProcessHandlers(this);
	}

	public async registerToBus(socketsPath: socketPathObject): Promise<void> {
		this.subSocket = axon.socket('sub-emitter') as SubEmitterSocket;
		this.subSocket.connect(socketsPath.pub);

		this.busRpcSocket = axon.socket('req') as ReqSocket;
		this.busRpcSocket.connect(socketsPath.rpc);
		this.busRpcClient = new RPCClient(this.busRpcSocket);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		this.busRpcClientCallPromisified = util.promisify(this.busRpcClient.call);

		// Channel Publish Socket is only required if the module has events
		if (this.eventsList.length > 0) {
			this.pubSocket = axon.socket('pub-emitter') as PubEmitterSocket;
			this.pubSocket.connect(socketsPath.sub);
		}

		// Channel RPC Server is only required if the module has actions
		if (this.actionsList.length > 0) {
			this.rpcSocketPath = `unix://${socketsPath.root}/${this.moduleAlias}_rpc.sock`;

			this.rpcSocket = axon.socket('rep') as RepSocket;
			this.rpcSocket.bind(this.rpcSocketPath);
			this.rpcServer = new RPCServer(this.rpcSocket);

			this.rpcServer.expose('invoke', (action: string, cb: NodeCallback) => {
				this.invoke(action)
					.then(data => cb(null, data))
					.catch(error => cb(error));
			});

			this.rpcServer.expose(
				'invokePublic',
				(action: string, cb: NodeCallback) => {
					this.invokePublic(action)
						.then(data => cb(null, data))
						.catch(error => cb(error));
				},
			);
		}

		return this.setupSockets();
	}

	public async setupSockets(): Promise<void> {
		await Promise.race([
			this._resolveWhenAllSocketsBound(),
			this._rejectWhenAnySocketFailsToBind(),
			this._rejectWhenTimeout(SOCKET_TIMEOUT_TIME),
		]);

		await this._removeAllListeners();
	}

	public subscribe(eventName: string, cb: EventCallback): void {
		const event = new Event(eventName);

		if (event.module === this.moduleAlias) {
			this.localBus.on(eventName, cb);
		} else {
			this.subSocket?.on(eventName, (data: EventInfoObject) => {
				cb(data);
			});
		}
	}

	public once(eventName: string, cb: EventCallback): void {
		const event = new Event(eventName);

		if (event.module === this.moduleAlias) {
			this.localBus.once(eventName, cb);
		} else {
			this.subSocket?.on(eventName, (data: EventInfoObject) => {
				this.subSocket?.off(eventName);
				cb(data);
			});
		}
	}

	public publish(eventName: string, data?: object): void {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public async invoke(actionName: string, params?: object): Promise<any> {
		const action = new Action(actionName, params, this.moduleAlias);

		if (action.module === this.moduleAlias) {
			// eslint-disable-next-line
			// @ts-ignore
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return this.actions[action.name].handler(action);
		}

		return new Promise((resolve, reject) => {
			this.busRpcClient?.call(
				'invoke',
				action.serialize(),
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(err: Error, data: any) => {
					if (err) {
						return reject(err);
					}

					return resolve(data);
				},
			);
		});
	}

	public async invokeFromNetwork(
		remoteMethod: string,
		params: object,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): Promise<any> {
		return this.invoke(`app:${remoteMethod}`, params);
	}

	public async publishToNetwork(
		actionName: string,
		data: object,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): Promise<any> {
		return this.invoke(`app:${actionName}`, data);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public async invokePublic(actionName: string, params?: object): Promise<any> {
		const action = new Action(actionName, params, this.moduleAlias);

		if (action.module === this.moduleAlias) {
			if (!this.actions[action.name].isPublic) {
				throw new Error(
					`Action ${action.name} is not allowed because it's not public.`,
				);
			}

			// eslint-disable-next-line
			// @ts-ignore
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return this.actions[action.name].handler(action);
		}

		return new Promise((resolve, reject) => {
			this.busRpcClient?.call(
				'invokePublic',
				action.serialize(),
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(err: Error, data: any) => {
					if (err) {
						return reject(err);
					}

					return resolve(data);
				},
			);
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public cleanup(_status?: number, _message?: string): void {
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

	private async _resolveWhenAllSocketsBound(): Promise<void> {
		const promises = [];

		if (this.pubSocket) {
			promises.push(
				new Promise(resolve => {
					this.pubSocket?.sock.once('connect', () => {
						resolve();
					});
				}),
			);
		}

		if (this.subSocket) {
			promises.push(
				new Promise(resolve => {
					this.subSocket?.sock.once('connect', () => {
						resolve();
					});
				}),
			);
		}

		if (this.rpcSocket) {
			promises.push(
				new Promise(resolve => {
					this.rpcSocket?.once('bind', () => {
						resolve();
					});
				}),
			);
		}

		if (this.busRpcSocket && this.busRpcClient) {
			promises.push(
				new Promise((resolve, reject) => {
					this.busRpcSocket?.once('connect', () => {
						this.busRpcClient?.call(
							'registerChannel',
							this.moduleAlias,
							this.eventsList.map((event: string) => event),
							this.actionsList.map((action: string) => action),
							{ type: 'ipcSocket', rpcSocketPath: this.rpcSocketPath },
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							(err: Error, result: any) => {
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

		await Promise.all(promises);
	}

	private async _rejectWhenAnySocketFailsToBind() {
		const promises = [];

		if (this.pubSocket) {
			promises.push(
				new Promise((_, reject) => {
					this.pubSocket?.sock.once('error', (err: Error) => {
						reject(err);
					});
				}),
			);
		}

		if (this.subSocket) {
			promises.push(
				new Promise((_, reject) => {
					this.subSocket?.sock.once('error', (err: Error) => {
						reject(err);
					});
				}),
			);
		}

		if (this.rpcSocket) {
			promises.push(
				new Promise((_, reject) => {
					this.rpcSocket?.once('error', (err: Error) => {
						reject(err);
					});
				}),
			);
		}

		return Promise.race(promises);
	}

	// eslint-disable-next-line class-methods-use-this
	private async _rejectWhenTimeout(timeInMillis: number) {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error('ChildProcessChannel sockets setup timeout'));
			}, timeInMillis);
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	private async _removeAllListeners(): Promise<void> {
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
