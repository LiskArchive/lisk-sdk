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
import { WSServer } from '../../../../src/controller/ws/ws_server';
import { RPCServer } from '../../../../src/engine/rpc/rpc_server';
import { fakeLogger } from '../../../utils/mocks';

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
	const dataPath = os.tmpdir();

	beforeEach(() => {
		jest.spyOn(WSServer.prototype, 'start').mockResolvedValue({} as never);
	});

	describe('constructor', () => {
		it('should create IPC server if ipc is enabled', () => {
			rpcServer = new RPCServer(dataPath, {
				modes: ['ipc'],
				host: '0.0.0.0',
				port: 7887,
				accessControlAllowOrigin: '*',
			});
			expect(rpcServer['_ipcServer']).toBeDefined();
		});

		it('should create WS server if ws is enabled', () => {
			rpcServer = new RPCServer(dataPath, {
				modes: ['ws'],
				host: '0.0.0.0',
				port: 7887,
				accessControlAllowOrigin: '*',
			});
			expect(rpcServer['_wsServer']).toBeDefined();
		});

		it('should create HTTP server if http is enabled', () => {
			rpcServer = new RPCServer(dataPath, {
				modes: ['http'],
				host: '0.0.0.0',
				port: 7887,
				accessControlAllowOrigin: '*',
			});
			expect(rpcServer['_httpServer']).toBeDefined();
		});
	});

	describe('start', () => {
		beforeEach(() => {
			rpcServer = new RPCServer(dataPath, {
				modes: ['ipc', 'http', 'ws'],
				host: '0.0.0.0',
				port: 7887,
				accessControlAllowOrigin: '*',
			});
			rpcServer.init({ logger: fakeLogger, chainID: Buffer.alloc(0) });
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
			expect(rpcServer['_wsServer']?.start).toHaveBeenCalledWith(
				fakeLogger,
				expect.any(Function),
				expect.any(Object),
			);
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
			rpcServer = new RPCServer(dataPath, {
				modes: ['ipc', 'http', 'ws'],
				host: '0.0.0.0',
				port: 7887,
				accessControlAllowOrigin: '*',
			});
			rpcServer.init({ logger: fakeLogger, chainID: Buffer.alloc(0) });
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

	describe('_isAllowedMethod', () => {
		it('should return true for a enabled method', () => {
			rpcServer = new RPCServer(dataPath, {
				modes: ['ipc'],
				host: '0.0.0.0',
				port: 7887,
				accessControlAllowOrigin: '*',
				allowedMethods: ['token_transfer'],
			});

			expect(rpcServer['_isAllowedMethod']('token', 'transfer')).toBeTrue();
		});

		it('should return true for method from a enabled namespace', () => {
			rpcServer = new RPCServer(dataPath, {
				modes: ['ipc'],
				host: '0.0.0.0',
				port: 7887,
				accessControlAllowOrigin: '*',
				allowedMethods: ['token'],
			});

			expect(rpcServer['_isAllowedMethod']('token', 'transfer')).toBeTrue();
		});

		it('should return false if a method is not enabled', () => {
			rpcServer = new RPCServer(dataPath, {
				modes: ['ipc'],
				host: '0.0.0.0',
				port: 7887,
				accessControlAllowOrigin: '*',
				allowedMethods: ['token_getBalance'],
			});

			expect(rpcServer['_isAllowedMethod']('token', 'transfer')).toBeFalse();
		});

		it('should return false when allowedMethods configuration is absent', () => {
			rpcServer = new RPCServer(dataPath, {
				modes: ['ipc'],
				host: '0.0.0.0',
				port: 7887,
				accessControlAllowOrigin: '*',
			});

			expect(rpcServer['_isAllowedMethod']('token', 'transfer')).toBeFalse();
		});
	});

	describe('_handleRequest()', () => {
		it('should throw for a non enabled method', async () => {
			rpcServer = new RPCServer(dataPath, {
				modes: ['ipc'],
				host: '0.0.0.0',
				port: 7887,
				accessControlAllowOrigin: '*',
				allowedMethods: ['token_transfer'],
			});

			const request = JSON.stringify({
				id: 1,
				jsonrpc: '2.0',
				method: 'token_getBalance',
				params: {
					address: 'lske5sqed53fdcs4m9et28f2k7u9fk6hno9bauday',
					tokenID: '0000000000000000',
				},
			});

			await expect(rpcServer['_handleRequest'](request)).rejects.toThrow(
				'Requested method or namespace is disabled in node config.',
			);
		});
	});
});
