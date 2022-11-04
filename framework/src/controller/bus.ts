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

import { LiskValidationError } from '@liskhq/lisk-validator';
import { EventEmitter2, ListenerFn } from 'eventemitter2';
import { Dealer, Router, Subscriber } from 'zeromq';
import { Logger } from '../logger';
import { ChannelType, EndpointInfo } from '../types';
import { Request } from './request';
import { BaseChannel } from './channels/base_channel';
import { IPC_EVENTS } from './constants';
import { Event, EventsDefinition } from './event';
import { IPCServer } from './ipc/ipc_server';
import * as JSONRPC from './jsonrpc';
import { JSONRPCError } from './jsonrpc';
import { getEndpointPath } from '../endpoint';

interface BusConfiguration {
	readonly internalIPCServer: IPCServer;
	readonly chainID: Buffer;
}

interface RegisterChannelOptions {
	readonly type: string;
	readonly channel: BaseChannel;
	readonly socketPath?: string;
}

interface ChannelInfo {
	readonly channel?: BaseChannel;
	readonly rpcClient?: Dealer;
	readonly endpointInfo: {
		[key: string]: EndpointInfo;
	};
	readonly events: EventsDefinition;
	readonly type: ChannelType;
}

interface RegisterToBusRequestObject {
	readonly moduleName: string;
	readonly eventsList: ReadonlyArray<string>;
	readonly endpointInfo: {
		[key: string]: EndpointInfo;
	};
	readonly options: RegisterChannelOptions;
}

const parseError = (id: JSONRPC.ID, err: Error | JSONRPC.JSONRPCError): JSONRPC.JSONRPCError => {
	if (err instanceof JSONRPC.JSONRPCError) {
		return err;
	}
	return new JSONRPC.JSONRPCError(
		err.message,
		JSONRPC.errorResponse(id, JSONRPC.internalError(err.message)),
	);
};

export class Bus {
	private readonly _endpointInfos: {
		[key: string]: EndpointInfo;
	};
	private readonly _events: { [key: string]: boolean };
	private readonly _channels: {
		[key: string]: ChannelInfo;
	};
	private readonly _rpcClients: { [key: string]: Dealer };
	private readonly _internalIPCServer: IPCServer;
	private readonly _rpcRequestIds: Set<string>;
	private readonly _emitter: EventEmitter2;

	private readonly _handleRPCResponse: (rpcClient: Dealer) => Promise<void>;
	private readonly _handleRPC: (rpcServer: Router) => Promise<void>;
	private readonly _handleEvents: (subSocket: Subscriber) => Promise<void>;

	private _logger!: Logger;

	public constructor(config: BusConfiguration) {
		this._emitter = new EventEmitter2({
			wildcard: true,
			delimiter: ':',
			maxListeners: 1000,
		});

		// Hash map used instead of arrays for performance.
		this._endpointInfos = {};
		this._events = {};
		this._channels = {};
		this._rpcClients = {};
		this._rpcRequestIds = new Set();
		this._internalIPCServer = config.internalIPCServer;

		// Handle RPC requests responses coming back from different ipcServers on rpcClient
		this._handleRPCResponse = async (rpcClient: Dealer): Promise<void> => {
			for await (const [requestId, result] of rpcClient) {
				if (this._rpcRequestIds.has(requestId.toString())) {
					this._emitter.emit(requestId.toString(), JSON.parse(result.toString()));
					continue;
				}
			}
		};

		this._handleRPC = async (rpcServer: Router): Promise<void> => {
			for await (const [sender, request, params] of rpcServer) {
				switch (request.toString()) {
					case IPC_EVENTS.REGISTER_CHANNEL: {
						const { moduleName, eventsList, endpointInfo, options } = JSON.parse(
							params.toString(),
						) as RegisterToBusRequestObject;
						this.registerChannel(moduleName, eventsList, endpointInfo, options).catch(err => {
							this._logger.debug(
								err,
								`Error occurred while Registering channel for module ${moduleName}.`,
							);
						});
						break;
					}
					case IPC_EVENTS.RPC_EVENT: {
						const requestData = JSON.parse(params.toString()) as JSONRPC.RequestObject;
						this.invoke(requestData)
							.then(result => {
								// Send back result RPC request for a given requestId
								rpcServer
									.send([sender, requestData.id as string, JSON.stringify(result)])
									.catch(error => {
										this._logger.debug(
											{ err: error as Error },
											`Failed to send request response: ${requestData.id as string} to ipc client.`,
										);
									});
							})
							.catch((err: JSONRPCError) => {
								rpcServer
									.send([sender, requestData.id as string, JSON.stringify(err.response)])
									.catch(error => {
										this._logger.debug(
											{ err: error as Error },
											`Failed to send error response: ${requestData.id as string} to ipc client.`,
										);
									});
							});
						break;
					}
					default:
						break;
				}
			}
		};

		this._handleEvents = async (subSocket: Subscriber) => {
			for await (const [_event, eventData] of subSocket) {
				this.publish(eventData.toString());
			}
		};
	}

	public async start(logger: Logger): Promise<void> {
		this._logger = logger;
		await this._setupIPCInternalServer();
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async registerChannel(
		namespace: string,
		// Events should also include the module name
		events: EventsDefinition,
		endpointInfo: { [key: string]: EndpointInfo },
		options: RegisterChannelOptions,
	): Promise<void> {
		if (Object.keys(this._channels).includes(namespace)) {
			throw new Error(`Channel for module ${namespace} is already registered.`);
		}

		events.forEach(eventName => {
			if (this._events[getEndpointPath(namespace, eventName)] !== undefined) {
				throw new Error(`Event "${eventName}" already registered with bus.`);
			}
			this._events[getEndpointPath(namespace, eventName)] = true;
		});

		for (const methodName of Object.keys(endpointInfo)) {
			if (this._endpointInfos[getEndpointPath(namespace, methodName)] !== undefined) {
				throw new Error(`Endpoint "${methodName}" already registered with bus.`);
			}

			this._endpointInfos[getEndpointPath(namespace, methodName)] = endpointInfo[methodName];
		}

		if (options.type === ChannelType.ChildProcess && options.socketPath) {
			const rpcClient = new Dealer();
			rpcClient.connect(options.socketPath);
			this._rpcClients[namespace] = rpcClient;

			this._handleRPCResponse(rpcClient).catch(err => {
				this._logger.debug(err, 'Error occured while listening to RPC results on RPC Dealer.');
			});

			this._channels[namespace] = {
				rpcClient,
				events,
				endpointInfo,
				type: ChannelType.ChildProcess,
			};
		} else {
			this._channels[namespace] = {
				channel: options.channel,
				events,
				endpointInfo,
				type: ChannelType.InMemory,
			};
		}
	}

	public async invoke<T>(
		rawRequest: string | JSONRPC.RequestObject,
	): Promise<JSONRPC.ResponseObjectWithResult<T>> {
		let requestObj!: JSONRPC.RequestObject;

		// As the request can be invoked from external source, so we should validate if it exists and valid JSON object
		if (!rawRequest) {
			this._logger.error('Empty invoke request.');
			throw new JSONRPC.JSONRPCError(
				'Invalid invoke request.',
				JSONRPC.errorResponse(null, JSONRPC.invalidRequest()),
			);
		}

		try {
			requestObj =
				typeof rawRequest === 'string'
					? (JSON.parse(rawRequest) as JSONRPC.RequestObject)
					: rawRequest;
		} catch (error) {
			throw new JSONRPC.JSONRPCError(
				'Invalid invoke request.',
				JSONRPC.errorResponse(null, JSONRPC.invalidRequest()),
			);
		}

		try {
			JSONRPC.validateJSONRPCRequest(requestObj as never);
		} catch (error) {
			this._logger.error({ err: error as LiskValidationError }, 'Invalid invoke request.');
			throw new JSONRPC.JSONRPCError(
				'Invalid invoke request.',
				JSONRPC.errorResponse(requestObj.id, JSONRPC.invalidRequest()),
			);
		}

		const request = Request.fromJSONRPCRequest(requestObj);

		const actionFullName = request.key();

		if (this._endpointInfos[actionFullName] === undefined) {
			throw new JSONRPC.JSONRPCError(
				`Request '${actionFullName}' is not registered to bus.`,
				JSONRPC.errorResponse(
					request.id,
					JSONRPC.internalError(`Request '${actionFullName}' is not registered to bus.`),
				),
			);
		}

		const actionParams = request.params;
		const channelInfo = this._channels[request.namespace];
		if (channelInfo.type === ChannelType.InMemory) {
			try {
				const result = await (channelInfo.channel as BaseChannel).invoke<T>({
					context: {},
					methodName: actionFullName,
					params: actionParams,
				});

				return request.buildJSONRPCResponse({
					result,
				}) as JSONRPC.ResponseObjectWithResult<T>;
			} catch (error) {
				throw parseError(request.id, error as Error);
			}
		}

		return new Promise((resolve, reject) => {
			this._rpcRequestIds.add(request.id as string);
			(channelInfo.rpcClient as Dealer)
				.send([IPC_EVENTS.RPC_EVENT, JSON.stringify(request.toJSONRPCRequest())])
				.then(_ => {
					const requestTimeout = setTimeout(() => {
						reject(new Error('Request timed out on invoke.'));
					}, IPC_EVENTS.RPC_REQUEST_TIMEOUT);
					// Listen to this event once for serving the request
					this._emitter.once(request.id as string, (response: JSONRPC.ResponseObject<T>) => {
						clearTimeout(requestTimeout);
						this._rpcRequestIds.delete(request.id as string);
						if (response.error) {
							reject(new Error(response.error.message));
							return;
						}
						resolve(response);
					});
				})
				.catch(err => {
					this._logger.debug(err, 'Error occurred while sending RPC request.');
				});
		});
	}

	public publish(rawRequest: string | JSONRPC.NotificationRequest): void {
		let request!: JSONRPC.NotificationRequest;
		// As the request can be invoked from external source, so we should validate if it exists and valid JSON object
		if (!rawRequest) {
			this._logger.error('Empty publish request.');
			throw new JSONRPC.JSONRPCError(
				'Invalid publish request.',
				JSONRPC.errorResponse(null, JSONRPC.invalidRequest()),
			);
		}

		try {
			request =
				typeof rawRequest === 'string'
					? (JSON.parse(rawRequest) as JSONRPC.RequestObject)
					: rawRequest;
		} catch (error) {
			throw new JSONRPC.JSONRPCError(
				'Invalid publish request.',
				JSONRPC.errorResponse(null, JSONRPC.invalidRequest()),
			);
		}

		try {
			JSONRPC.validateJSONRPCNotification(request as never);
		} catch (error) {
			this._logger.error({ err: error as LiskValidationError }, 'Invalid publish request.');
			throw new JSONRPC.JSONRPCError(
				'Invalid publish request.',
				JSONRPC.errorResponse(null, JSONRPC.invalidRequest()),
			);
		}

		const event = Event.fromJSONRPCNotification(rawRequest);
		const eventName = event.key();
		const notification = event.toJSONRPCNotification();

		if (!this.getEvents().includes(eventName)) {
			throw new JSONRPC.JSONRPCError(
				`Event ${eventName} is not registered to bus.`,
				JSONRPC.errorResponse(
					null,
					JSONRPC.internalError(`Event ${eventName} is not registered to bus.`),
				),
			);
		}

		// Communicate through event emitter
		this._emitter.emit(eventName, notification);

		// Communicate through unix socket
		if (this._internalIPCServer) {
			this._internalIPCServer.pubSocket
				.send([eventName, JSON.stringify(notification)])
				.catch(error => {
					this._logger.debug(
						{ err: error as Error },
						`Failed to publish event: ${eventName} to ipc server.`,
					);
				});
		}
	}

	public subscribe(eventName: string, cb: ListenerFn): void {
		if (!this.getEvents().includes(eventName)) {
			this._logger.info(`Event ${eventName} was subscribed but not registered to the bus yet.`);
		}

		// Communicate through event emitter
		this._emitter.on(eventName, cb);
	}

	public unsubscribe(eventName: string, cb: ListenerFn): void {
		if (!this.getEvents().includes(eventName)) {
			this._logger.info(
				`Can't unsubscribe to event ${eventName} that was not registered to the bus yet.`,
			);
		}

		this._emitter.off(eventName, cb);
	}

	public once(eventName: string, cb: ListenerFn): this {
		if (!this.getEvents().includes(eventName)) {
			this._logger.info(`Event ${eventName} was subscribed but not registered to the bus yet.`);
		}

		// Communicate through event emitter
		this._emitter.once(eventName, cb);

		return this;
	}

	public getEndpoints(): ReadonlyArray<string> {
		return Object.keys(this._endpointInfos);
	}

	public getEvents(): ReadonlyArray<string> {
		return Object.keys(this._events);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async cleanup(): Promise<void> {
		this._emitter.removeAllListeners();
		this._internalIPCServer?.stop();

		// Close all the RPC Clients
		for (const key of Object.keys(this._rpcClients)) {
			this._rpcClients[key].close();
		}
	}

	private async _setupIPCInternalServer(): Promise<void> {
		if (!this._internalIPCServer) {
			return;
		}
		await this._internalIPCServer.start();

		this._handleEvents(this._internalIPCServer.subSocket).catch(err => {
			this._logger.debug(err, 'Error occured while listening to events on subscriber.');
		});

		this._handleRPC(this._internalIPCServer.rpcServer).catch(err => {
			this._logger.debug(err, 'Error occured while listening to RPCs on RPC router.');
		});
	}
}
