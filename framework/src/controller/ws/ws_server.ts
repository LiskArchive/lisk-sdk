/*
 * Copyright © 2020 Lisk Foundation
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
import { utils } from '@liskhq/lisk-cryptography';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import * as WebSocket from 'ws';
import { Logger } from '../../logger';
import { NotificationRequest, RequestObject } from '../jsonrpc';

interface WebSocketWithTracking extends WebSocket {
	isAlive?: boolean;
	id: string;
}

export type WSMessageHandler = (socket: WebSocketWithTracking, message: string) => void;

export class WSServer {
	public server!: WebSocket.Server;

	private _pingTimer!: NodeJS.Timeout;
	private _logger!: Logger;
	private readonly _port: number;
	private readonly _host?: string;
	private readonly _path: string;
	// subscription holds id: event names array
	private readonly _subscriptions: Record<string, Set<string>> = {};

	public constructor(options: { port: number; host?: string; path: string }) {
		this._port = options.port;
		this._host = options.host;
		this._path = options.path;
	}

	public start(
		logger: Logger,
		messageHandler: WSMessageHandler,
		httpServer?: WebSocket.ServerOptions['server'],
	): WebSocket.Server {
		this._logger = logger;
		if (httpServer) {
			this.server = new WebSocket.Server({
				noServer: true,
			});
			httpServer.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				if (request.url === this._path) {
					this.server.handleUpgrade(request, socket, head, ws => {
						this.server.emit('connection', ws, request);
					});
				} else {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
					socket.destroy();
				}
			});
		} else {
			this.server = new WebSocket.Server({
				path: this._path,
				port: this._port,
				host: this._host,
				clientTracking: true,
			});
		}

		this.server.on('connection', socket =>
			this._handleConnection(socket as WebSocketWithTracking, messageHandler),
		);
		this.server.on('error', error => {
			this._logger.error(error);
		});
		this.server.on('listening', () => {
			this._logger.info(
				{ host: this._host, port: this._port, path: this._path },
				'Websocket Server Ready',
			);
		});

		this.server.on('close', () => {
			clearInterval(this._pingTimer);
		});

		this._pingTimer = this._setUpPing();

		this._logger.info(`RPC WS Server starting at ${this._host ?? ''}:${this._port}${this._path}`);

		return this.server;
	}

	public stop(): void {
		if (this.server) {
			this.server.close();
		}
	}

	public broadcast(message: NotificationRequest): void {
		for (const client of this.server.clients) {
			const wsClient = client as WebSocketWithTracking;
			if (wsClient.readyState === WebSocket.OPEN && wsClient.id) {
				const subscription = this._subscriptions[wsClient.id];
				if (!subscription) {
					continue;
				}
				if (
					Array.from(subscription).some(
						key => message.method === key || message.method.includes(key),
					)
				) {
					client.send(JSON.stringify(message));
				}
			}
		}
	}

	private _handleConnection(socket: WebSocketWithTracking, messageHandler: WSMessageHandler) {
		// eslint-disable-next-line no-param-reassign
		socket.isAlive = true;
		// eslint-disable-next-line no-param-reassign
		socket.id = utils.getRandomBytes(20).toString('hex');
		socket.on('message', (message: string) => {
			// Read the message, and if it's subscription message, handle here
			try {
				const parsedMessage = JSON.parse(message) as RequestObject;
				if (parsedMessage.method === 'subscribe') {
					this._handleSubscription(socket, parsedMessage);
					return;
				}
				if (parsedMessage.method === 'unsubscribe') {
					this._handleUnsubscription(socket, parsedMessage);
					return;
				}
			} catch (error) {
				this._logger.error({ err: error as Error }, 'Received invalid websocket message');
				return;
			}
			messageHandler(socket, message);
		});
		socket.on('pong', () => this._handleHeartbeat(socket));
		socket.on('close', () => {
			delete this._subscriptions[socket.id];
		});
		this._logger.info('New web socket client connected');
	}

	private _handleHeartbeat(socket: WebSocketWithTracking) {
		// eslint-disable-next-line no-param-reassign
		socket.isAlive = true;
	}

	private _setUpPing() {
		return setInterval(() => {
			for (const socket of this.server.clients) {
				const aClient = socket as WebSocketWithTracking;
				if (aClient.isAlive === false) {
					return socket.terminate();
				}

				aClient.isAlive = false;
				// eslint-disable-next-line @typescript-eslint/no-empty-function
				aClient.ping(() => {});
			}
			return null;
		}, 3000);
	}

	private _handleSubscription(socket: WebSocketWithTracking, message: Partial<RequestObject>) {
		const { params } = message;
		if (!params || !Array.isArray(params.topics) || !params.topics.length) {
			throw new Error('Invalid subscription message.');
		}
		if (!this._subscriptions[socket.id]) {
			this._subscriptions[socket.id] = new Set<string>();
		}
		for (const eventName of params.topics) {
			this._subscriptions[socket.id].add(eventName as string);
		}
	}

	private _handleUnsubscription(socket: WebSocketWithTracking, message: Partial<RequestObject>) {
		const { params } = message;
		if (!params || !Array.isArray(params.topics) || !params.topics.length) {
			throw new Error('Invalid unsubscription message.');
		}
		if (!this._subscriptions[socket.id]) {
			return;
		}
		for (const eventName of params.topics) {
			this._subscriptions[socket.id].delete(eventName as string);
		}
	}
}
