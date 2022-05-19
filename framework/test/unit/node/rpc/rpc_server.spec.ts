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
import * as os from 'os';
import * as path from 'path';
import { RPCServer } from '../../../../src/node/rpc/rpc_server';
import { fakeLogger } from '../../../utils/node';

jest.mock('ws');
jest.mock('http', () => {
	return {
		createServer: jest.fn().mockReturnValue({ listen: jest.fn(), on: jest.fn(), close: jest.fn() }),
	};
});
jest.mock('zeromq', () => {
	return {
		Publisher: jest
			.fn()
			.mockReturnValue({ bind: jest.fn(), close: jest.fn(), subscribe: jest.fn() }),
		Subscriber: jest
			.fn()
			.mockReturnValue({ bind: jest.fn(), close: jest.fn(), subscribe: jest.fn() }),
		Router: jest.fn().mockReturnValue({ bind: jest.fn(), close: jest.fn() }),
	};
});

describe('RPC server', () => {
	let rpcServer: RPCServer;

	describe('constructor', () => {
		it('should create IPC server if ipc is enabled', () => {
			rpcServer = new RPCServer({
				modes: ['ipc'],
				ipc: {
					path: path.join(os.tmpdir(), Date.now().toString()),
				},
			});
			expect(rpcServer['_ipcServer']).not.toBeUndefined();
		});

		it('should create WS server if ws is enabled', () => {
			rpcServer = new RPCServer({
				modes: ['ws'],
				ws: {
					host: '0.0.0.0',
					path: '/rpc',
					port: 12345,
				},
			});
			expect(rpcServer['_wsServer']).not.toBeUndefined();
		});

		it('should create HTTP server if http is enabled', () => {
			rpcServer = new RPCServer({
				modes: ['http'],
				http: {
					host: '0.0.0.0',
					port: 12345,
				},
			});
			expect(rpcServer['_httpServer']).not.toBeUndefined();
		});
	});

	describe('start', () => {
		beforeEach(() => {
			rpcServer = new RPCServer({
				modes: ['ipc', 'ws', 'http'],
				ipc: {
					path: path.join(os.tmpdir(), Date.now().toString()),
				},
				ws: {
					host: '0.0.0.0',
					path: '/rpc',
					port: 12349,
				},
				http: {
					host: '0.0.0.0',
					port: 12346,
				},
			});
			rpcServer.init({ logger: fakeLogger, networkIdentifier: Buffer.alloc(0) });
			// eslint-disable-next-line @typescript-eslint/require-await
			rpcServer.registerEndpoint('system', 'getNodeInfo', async () => {
				return {
					success: true,
				};
			});
		});

		it('should call ipc server start and start handle request', async () => {
			jest.spyOn(rpcServer['_ipcServer'] as never, 'start' as never);
			jest.spyOn(rpcServer, '_handleIPCRequest' as never);

			await rpcServer.start();

			expect(rpcServer['_ipcServer']?.start).toHaveBeenCalledTimes(1);
			expect(rpcServer['_handleIPCRequest']).toHaveBeenCalledTimes(1);
		});

		it('should call ws server start', async () => {
			jest.spyOn(rpcServer['_wsServer'] as never, 'start' as never);

			await rpcServer.start();

			expect(rpcServer['_wsServer']?.start).toHaveBeenCalledTimes(1);
			expect(rpcServer['_wsServer']?.start).toHaveBeenCalledWith(fakeLogger, expect.any(Function));
		});

		it('should call http server start', async () => {
			jest.spyOn(rpcServer['_httpServer'] as never, 'start' as never);

			await rpcServer.start();

			expect(rpcServer['_httpServer']?.start).toHaveBeenCalledTimes(1);
			expect(rpcServer['_httpServer']?.start).toHaveBeenCalledWith(
				fakeLogger,
				expect.any(Function),
			);
		});
	});

	describe('stop', () => {
		beforeEach(async () => {
			rpcServer = new RPCServer({
				modes: ['ipc', 'ws', 'http'],
				ipc: {
					path: path.join(os.tmpdir(), Date.now().toString()),
				},
				ws: {
					host: '0.0.0.0',
					path: '/rpc',
					port: 12349,
				},
				http: {
					host: '0.0.0.0',
					port: 12346,
				},
			});
			rpcServer.init({ logger: fakeLogger, networkIdentifier: Buffer.alloc(0) });
			// eslint-disable-next-line @typescript-eslint/require-await
			rpcServer.registerEndpoint('system', 'getNodeInfo', async () => {
				return {
					success: true,
				};
			});
			await rpcServer.start();
		});

		it('should call ipc server stop', () => {
			jest.spyOn(rpcServer['_ipcServer'] as never, 'stop' as never);

			rpcServer.stop();

			expect(rpcServer['_ipcServer']?.stop).toHaveBeenCalledTimes(1);
		});

		it('should call ws server stop', () => {
			jest.spyOn(rpcServer['_wsServer'] as never, 'stop' as never);

			rpcServer.stop();

			expect(rpcServer['_wsServer']?.stop).toHaveBeenCalledTimes(1);
		});

		it('should call http server stop', () => {
			jest.spyOn(rpcServer['_httpServer'] as never, 'stop' as never);

			rpcServer.stop();

			expect(rpcServer['_httpServer']?.stop).toHaveBeenCalledTimes(1);
		});
	});
});
