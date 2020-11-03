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
	const config = {
		port: 8080,
		path: '/ws',
		logger: {
			info: jest.fn(),
			error: jest.fn(),
			trace: jest.fn(),
			debug: jest.fn(),
			warn: jest.fn(),
			fatal: jest.fn(),
			level: jest.fn(),
		},
	};

	describe('constructor()', () => {
		it('should setup class properties based on config', () => {
			const wsServerInstance = new WSServer(config);
			expect(wsServerInstance['port']).toBe(config.port);
			expect(wsServerInstance['path']).toBe(config.path);
			expect(wsServerInstance['logger']).toBe(config.logger);
		});
	});

	describe('start()', () => {
		let wsServerInstance: WSServer;
		beforeEach(() => {
			wsServerInstance = new WSServer(config);
			wsServerInstance.start();
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
			const wsServerInstance = new WSServer(config);
			wsServerInstance.start();
			const stopSpy = jest.spyOn(wsServerInstance.server, 'close');
			wsServerInstance.stop();
			expect(stopSpy).toHaveBeenCalled();
		});
	});
});
