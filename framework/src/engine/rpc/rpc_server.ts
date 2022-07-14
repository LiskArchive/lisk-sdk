/* eslint-disable no-loop-func */
/*
 * Copyright © 2022 Lisk Foundation
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

import { Router } from 'zeromq';
import { RPC_MODES } from '../../constants';
import { HTTPServer } from '../../controller/http/http_server';
import { IPCServer } from '../../controller/ipc/ipc_server';
import { WSServer } from '../../controller/ws/ws_server';
import { Logger } from '../../logger';
import { RPCConfig } from '../../types';
import { Request } from '../../controller/request';
import * as JSONRPC from '../../controller/jsonrpc';
import { notificationRequest } from '../../controller/jsonrpc';
import { systemDirsFromDataPath } from '../../system_dirs';

export interface RequestContext {
	params: Record<string, unknown>;
	networkIdentifier: Buffer;
	logger: Logger;
}

export type Handler = (context: RequestContext) => Promise<unknown>;
export type NotFoundHandler = (
	namespace: string,
	mehtod: string,
	context: RequestContext,
) => Promise<unknown>;

export class RPCServer {
	private readonly _config: RPCConfig;

	private readonly _ipcServer?: IPCServer;
	private readonly _wsServer?: WSServer;
	private readonly _httpServer?: HTTPServer;

	// <namespace: <method: Handler>>
	private readonly _rpcHandler: Record<string, Record<string, Handler | undefined>> = {};
	private _notFoundHandler?: NotFoundHandler;

	private _logger!: Logger;
	private _networkIdentifier!: Buffer;

	public constructor(dataPath: string, config: RPCConfig) {
		this._config = config;
		if (this._config.modes.includes(RPC_MODES.IPC)) {
			const systemDirs = systemDirsFromDataPath(dataPath);
			this._ipcServer = new IPCServer({
				socketsDir: systemDirs.sockets,
				name: 'engine',
				externalSocket: true,
			});
		}

		if (this._config.modes.includes(RPC_MODES.WS)) {
			this._wsServer = new WSServer({
				path: '/rpc-ws',
				port: this._config.port,
				host: this._config.host,
			});
		}

		if (this._config.modes.includes(RPC_MODES.HTTP)) {
			this._httpServer = new HTTPServer({
				host: this._config.host,
				port: this._config.port,
				path: '/rpc',
				ignorePaths: ['/rpc-ws'],
			});
		}
	}

	public init(options: { logger: Logger; networkIdentifier: Buffer }): void {
		this._logger = options.logger;
		this._networkIdentifier = options.networkIdentifier;
	}

	public async start(): Promise<void> {
		if (this._ipcServer) {
			await this._ipcServer.start();
			this._handleIPCRequest(this._ipcServer.rpcServer).catch(err => {
				this._logger.debug(err, 'Error occured while listening to RPCs on RPC router.');
			});
			this._logger.info(`RPC IPC Server starting at ${this._ipcServer.socketPaths.rpcServer}`);
		}

		if (this._httpServer) {
			this._httpServer.start(this._logger, (_req, res, message) => {
				this._handleRequest(message)
					.then(data => {
						res.end(JSON.stringify(data));
					})
					.catch((error: JSONRPC.JSONRPCError) => {
						res.end(JSON.stringify(error.response));
					});
			});
		}

		if (this._wsServer) {
			this._wsServer.start(
				this._logger,
				(socket, message) => {
					this._handleRequest(message)
						.then(data => {
							socket.send(JSON.stringify(data));
						})
						.catch((error: JSONRPC.JSONRPCError) => {
							socket.send(JSON.stringify(error.response));
						});
				},
				this._httpServer?.server,
			);
		}
		this._httpServer?.listen();
	}

	public stop(): void {
		if (this._ipcServer) {
			this._ipcServer.stop();
		}

		if (this._wsServer) {
			this._wsServer.stop();
		}

		if (this._httpServer) {
			this._httpServer.stop();
		}
	}

	public async publish(eventName: string, data: Record<string, unknown>): Promise<void> {
		await this._publishIPC(eventName, data);
		this._publishWS(eventName, data);
	}

	public registerEndpoint(namespace: string, method: string, handler: Handler): void {
		const existingNamespace = this._rpcHandler[namespace];
		if (!existingNamespace) {
			this._rpcHandler[namespace] = {};
		}
		const existingMethod = this._rpcHandler[namespace][method];
		if (existingMethod) {
			throw new Error(`Method ${method} in ${namespace} is already registered.`);
		}
		this._rpcHandler[namespace][method] = handler;
	}

	public registerNotFoundEndpoint(handler: NotFoundHandler): void {
		if (this._notFoundHandler) {
			throw new Error('NotFoundHandler is already registered.');
		}
		this._notFoundHandler = handler;
	}

	private async _handleIPCRequest(rpcServer: Router): Promise<void> {
		for await (const [sender, request] of rpcServer) {
			this._handleRequest(request.toString())
				.then(result => {
					rpcServer.send([sender, JSON.stringify(result)]).catch(error => {
						this._logger.debug(
							{ err: error as Error },
							`Failed to send request response: ${result.id as string} to ipc client.`,
						);
					});
				})
				.catch((err: JSONRPC.JSONRPCError) => {
					rpcServer.send([sender, JSON.stringify(err.response)]).catch(error => {
						this._logger.debug({ err: error as Error }, `Failed to send error response.`);
					});
				});
		}
	}

	private async _handleRequest(rawRequest: string): Promise<JSONRPC.ResponseObjectWithResult> {
		if (!rawRequest) {
			this._logger.error('Empty invoke request.');
			throw new JSONRPC.JSONRPCError(
				'Invalid invoke request.',
				JSONRPC.errorResponse(null, JSONRPC.invalidRequest()),
			);
		}
		let requestObj: unknown;
		try {
			requestObj = JSON.parse(rawRequest);
		} catch (error) {
			throw new JSONRPC.JSONRPCError(
				'Invalid RPC request. Failed to parse request params.',
				JSONRPC.errorResponse(null, JSONRPC.invalidRequest()),
			);
		}

		try {
			JSONRPC.validateJSONRPCRequest(requestObj);
		} catch (error) {
			this._logger.error({ err: error as Error }, 'Invalid RPC request.');
			throw new JSONRPC.JSONRPCError(
				'Invalid RPC request. Invalid request format.',
				JSONRPC.errorResponse(null, JSONRPC.invalidRequest()),
			);
		}

		try {
			const request = Request.fromJSONRPCRequest(requestObj);
			const handler = this._getHandler(request.namespace, request.name);

			const context = {
				logger: this._logger,
				networkIdentifier: this._networkIdentifier,
				params: requestObj.params ?? {},
			};
			if (!handler) {
				if (this._notFoundHandler) {
					const result = await this._notFoundHandler(request.namespace, request.name, context);
					return request.buildJSONRPCResponse({ result }) as JSONRPC.ResponseObjectWithResult;
				}
				throw new JSONRPC.JSONRPCError(
					`Method ${request.name} with in namespace ${request.namespace} does not exist`,
					JSONRPC.errorResponse(requestObj.id, JSONRPC.methodNotFound()),
				);
			}
			const result = await handler(context);
			return request.buildJSONRPCResponse({ result }) as JSONRPC.ResponseObjectWithResult;
		} catch (error) {
			if (error instanceof JSONRPC.JSONRPCError) {
				throw error;
			}
			throw new JSONRPC.JSONRPCError(
				(error as Error).message,
				JSONRPC.errorResponse(requestObj.id, JSONRPC.invalidRequest()),
			);
		}
	}

	private async _publishIPC(eventName: string, data: Record<string, unknown>): Promise<void> {
		if (!this._ipcServer) {
			return;
		}
		const notification = notificationRequest(eventName, data);
		try {
			await this._ipcServer.pubSocket.send([eventName, JSON.stringify(notification)]);
		} catch (error) {
			this._logger.debug(
				{ err: error as Error },
				`Failed to publish event: ${eventName} to ipc server.`,
			);
		}
	}

	private _publishWS(eventName: string, data: Record<string, unknown>): void {
		if (!this._wsServer) {
			return;
		}
		const notification = notificationRequest(eventName, data);
		this._wsServer.broadcast(notification);
	}

	private _getHandler(namespace: string, method: string): Handler | undefined {
		const existingNamespace = this._rpcHandler[namespace];
		if (!existingNamespace) {
			return undefined;
		}
		const existingMethod = this._rpcHandler[namespace][method];
		if (!existingMethod) {
			return undefined;
		}
		return existingMethod;
	}
}
