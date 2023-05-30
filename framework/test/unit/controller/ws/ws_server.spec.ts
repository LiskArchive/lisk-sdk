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

import * as WebSocket from 'ws';
import { WSServer } from '../../../../src/controller/ws/ws_server';

describe('WSServer', () => {
	const logger = {
		info: jest.fn(),
		error: jest.fn(),
		trace: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		fatal: jest.fn(),
		level: jest.fn(),
	};
	const config = {
		port: 8888,
		path: '/ws',
		accessControlAllowOrigin: '*',
	};
	let wsServerInstance: WSServer;
	const wsMessageHandler = jest.fn();

	describe('constructor()', () => {
		it('should setup class properties based on config', () => {
			wsServerInstance = new WSServer(config);
			expect(wsServerInstance['_port']).toBe(config.port);
			expect(wsServerInstance['_path']).toBe(config.path);
		});
	});

	describe('start()', () => {
		beforeEach(() => {
			wsServerInstance = new WSServer(config);

			jest.spyOn(WebSocket.Server.prototype, 'on');

			wsServerInstance.start(logger, wsMessageHandler);
		});

		afterEach(() => {
			wsServerInstance.stop();
		});

		it('should create a WSServer instance', () => {
			// Assert
			expect(wsServerInstance.server).toBeInstanceOf(WebSocket.Server);
		});

		it('should setup event handlers', () => {
			// Assert
			expect(wsServerInstance.server.eventNames()).toEqual([
				'connection',
				'error',
				'listening',
				'close',
			]);
		});
	});

	describe('stop()', () => {
		it('should call stop on the WS server', () => {
			wsServerInstance = new WSServer(config);
			wsServerInstance.start(logger, wsMessageHandler);
			const stopSpy = jest.spyOn(wsServerInstance.server, 'close');
			wsServerInstance.stop();
			expect(stopSpy).toHaveBeenCalled();
		});
	});

	describe('_handleConnection', () => {
		it('should add tracking properties', () => {
			const socket = {
				on: jest.fn(),
			} as any;
			wsServerInstance['_handleConnection'](socket, jest.fn);

			expect(socket.id).not.toBeEmpty();
			expect(socket.isAlive).toBeTrue();
		});

		it('should register handlers', () => {
			const socket = {
				on: jest.fn(),
			};
			wsServerInstance['_handleConnection'](socket as never, jest.fn);

			expect(socket.on).toHaveBeenCalledWith('message', expect.any(Function));
			expect(socket.on).toHaveBeenCalledWith('pong', expect.any(Function));
			expect(socket.on).toHaveBeenCalledWith('close', expect.any(Function));
		});
	});
});
