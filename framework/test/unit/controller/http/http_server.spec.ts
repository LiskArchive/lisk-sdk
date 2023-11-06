/*
 * Copyright © 2021 Lisk Foundation
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
import * as HTTP from 'http';
import { HTTPServer } from '../../../../src/controller/http/http_server';
import { fakeLogger } from '../../../utils/mocks';

describe('HTTPServer', () => {
	const logger = fakeLogger;
	const config = {
		port: 8000,
		accessControlAllowOrigin: '*',
	};
	let httpServerInstance: HTTPServer;
	const httpRequestListener = jest.fn();

	describe('constructor()', () => {
		it('should setup class properties based on config', () => {
			httpServerInstance = new HTTPServer(config);
			expect(httpServerInstance['_port']).toBe(config.port);
		});
	});

	describe('start()', () => {
		beforeEach(() => {
			httpServerInstance = new HTTPServer(config);
			httpServerInstance.start(logger, httpRequestListener);
		});

		afterEach(() => {
			httpServerInstance.stop();
		});

		it('should create a HTTPServer instance', () => {
			// Assert
			expect(httpServerInstance.server).toBeInstanceOf(HTTP.Server);
		});

		it('should setup event handlers', () => {
			// Assert
			expect(httpServerInstance.server.eventNames()).toEqual(['request', 'connection', 'error']);
		});
	});

	describe('stop()', () => {
		it('should call stop on the HTTP server', () => {
			httpServerInstance = new HTTPServer(config);
			httpServerInstance.start(logger, httpRequestListener);
			const stopSpy = jest.spyOn(httpServerInstance.server, 'close');
			httpServerInstance.stop();
			expect(stopSpy).toHaveBeenCalled();
		});
	});
});
