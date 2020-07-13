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

// eslint-disable-next-line
/// <reference path="../../../external_types/pm2-axon/index.d.ts" />
// eslint-disable-next-line
/// <reference path="../../../external_types/pm2-axon-rpc/index.d.ts" />

import { EventEmitter2, Listener } from 'eventemitter2';
import { Server as RPCServer, Client as RPCClient } from 'pm2-axon-rpc';
import { PubSocket, PullSocket, PushSocket, SubSocket } from 'pm2-axon';
import { Action, ActionsDefinition } from '../action';
import { Event, EventInfoObject } from '../event';
import { BaseChannel, BaseChannelOptions } from './base_channel';
import { SocketPaths } from '../types';
import { IPCClient } from '../ipc/ipc_client';
import { ActionInfoForBus } from '../../types';

export const setupProcessHandlers = (channel: IPCChannel): void => {
	process.once('SIGTERM', () => channel.cleanup(1));
	process.once('SIGINT', () => channel.cleanup(1));
	process.once('exit', code => channel.cleanup(code));
};

type NodeCallback = (error: Error | null, result?: unknown) => void;

interface ChildProcessOptions extends BaseChannelOptions {
	socketsPath: SocketPaths;
}

export class IPCChannel extends BaseChannel {
	private readonly _emitter: EventEmitter2;
	private readonly _ipcClient: IPCClient;

	public constructor(
		moduleAlias: string,
		events: ReadonlyArray<string>,
		actions: ActionsDefinition,
		options: ChildProcessOptions,
	) {
		super(moduleAlias, events, actions, options);

		this._ipcClient = new IPCClient({
			socketsDir: options.socketsPath.root,
			name: moduleAlias,
			rpcServerSocketPath: `unix://${options.socketsPath.root}/bus_rpc_socket.sock`,
		});

		this._emitter = new EventEmitter2({
			wildcard: true,
			delimiter: ':',
			maxListeners: 1000,
		});

		setupProcessHandlers(this);
	}

	public async registerToBus(): Promise<void> {
		await this._ipcClient.start();

		// Register channel details
		await new Promise((resolve, reject) => {
			let actionsInfo: { [key: string]: ActionInfoForBus } = {};
			actionsInfo = Object.keys(this.actions).reduce((accumulator, value: string) => {
				accumulator[value] = {
					name: value,
					module: this.moduleAlias,
					isPublic: this.actions[value].isPublic,
				};
				return accumulator;
			}, actionsInfo);

			this._rpcClient.call(
				'registerChannel',
				this.moduleAlias,
				this.eventsList.map((event: string) => event),
				actionsInfo,
				{
					type: 'ipcSocket',
					rpcSocketPath: this._ipcClient.rpcServerSocketPath,
				},
				(err: Error, result: object) => {
					if (err !== undefined && err !== null) {
						reject(err);
					}
					resolve(result);
				},
			);
		});

		// Channel RPC Server is only required if the module has actions
		if (this.actionsList.length > 0) {
			this._rpcServer.expose('invoke', (action, cb: NodeCallback) => {
				const actionObject = Action.deserialize(action);
				this.invoke(`${actionObject.module}:${actionObject.name}`, actionObject.params)
					.then(data => cb(null, data))
					.catch(error => cb(error));
			});

			this._rpcServer.expose('invokePublic', (action: string, cb: NodeCallback) => {
				this.invokePublic(action)
					.then(data => cb(null, data))
					.catch(error => cb(error));
			});
		}

		// Listen to messages
		this._subSocket.on('message', (eventName: string, eventData: EventInfoObject) => {
			if (eventData.module !== this.moduleAlias) {
				this._emitter.emit(eventName, eventData);
			}
		});
	}

	public subscribe(eventName: string, cb: Listener): void {
		const event = new Event(eventName);
		this._emitter.on(event.key(), cb);
	}

	public once(eventName: string, cb: Listener): void {
		const event = new Event(eventName);
		this._emitter.once(event.key(), cb);
	}

	public publish(eventName: string, data?: object): void {
		const event = new Event(eventName, data);

		if (event.module !== this.moduleAlias || !this.eventsList.includes(event.name)) {
			throw new Error(`Event "${eventName}" not registered in "${this.moduleAlias}" module.`);
		}

		this._pubSocket.send(event.key(), event.serialize());
	}

	public async invoke<T>(actionName: string, params?: object): Promise<T> {
		const action = new Action(actionName, params, this.moduleAlias);

		if (action.module === this.moduleAlias) {
			const handler = this.actions[action.name]?.handler;
			if (!handler) {
				throw new Error('Handler does not exist.');
			}
			return handler(action.serialize()) as T;
		}

		return new Promise((resolve, reject) => {
			this._rpcClient.call(
				'invoke',
				action.serialize(),
				(err: Error | undefined, data: T | PromiseLike<T>) => {
					if (err) {
						return reject(err);
					}

					return resolve(data);
				},
			);
		});
	}

	public async invokePublic<T>(actionName: string, params?: object): Promise<T> {
		const action = new Action(actionName, params, this.moduleAlias);

		if (action.module === this.moduleAlias) {
			if (!this.actions[action.name].isPublic) {
				throw new Error(`Action ${action.name} is not allowed because it's not public.`);
			}
			const handler = this.actions[action.name]?.handler;
			if (!handler) {
				throw new Error('Handler does not exist.');
			}

			return handler(action.serialize()) as T;
		}

		return new Promise((resolve, reject) => {
			this._rpcClient.call(
				'invokePublic',
				action.serialize(),
				(err: Error, data: T | PromiseLike<T>) => {
					if (err !== undefined) {
						return reject(err);
					}

					return resolve(data);
				},
			);
		});
	}

	public cleanup(_status?: number, _message?: string): void {
		this._ipcClient.stop();
		process.removeAllListeners('SIGTERM');
		process.removeAllListeners('SIGINT');
		process.removeAllListeners('exit');
	}

	private get _rpcServer(): RPCServer {
		return this._ipcClient.rpcServer;
	}

	private get _rpcClient(): RPCClient {
		return this._ipcClient.rpcClient;
	}

	private get _pubSocket(): PubSocket | PushSocket {
		return this._ipcClient.pubSocket;
	}

	private get _subSocket(): PullSocket | SubSocket {
		return this._ipcClient.subSocket;
	}
}
