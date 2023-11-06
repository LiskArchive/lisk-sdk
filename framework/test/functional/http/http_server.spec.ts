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
// TODO: Fix the test when functional test is fixed https://github.com/LiskHQ/lisk-sdk/issues/7209

// import axios from 'axios';
// import { createApplication, closeApplication } from '../utils/application';

// import { Application } from '../../../src';

// const requestHTTPServer = async (
// 	options: { host: string; port: number },
// 	reqData: Record<string, unknown>,
// ) => {
// 	const url = `http://${options.host}:${options.port}`;
// 	const { data, status } = await axios.post(
// 		url,
// 		{ ...reqData },
// 		{
// 			headers: {
// 				'Content-Type': 'application/json',
// 			},
// 		},
// 	);

// 	expect(status).toEqual(200);

// 	return data;
// };

// describe('HTTP server', () => {
// 	let app: Application;

// 	beforeAll(async () => {
// 		app = await createApplication('http-tests');
// 	});

// 	afterAll(async () => {
// 		await closeApplication(app);
// 	});

// 	describe('communication', () => {
// 		it('should respond with invalid jsonrpc request if "id" is missing', async () => {
// 			// Arrange
// 			const requestData = { jsonrpc: '2.0', method: 'app_getNodeInfo' };

// 			// Act
// 			const result = await requestHTTPServer(app.config.rpc, requestData);

// 			// Assert
// 			expect(result).toEqual({
// 				jsonrpc: '2.0',
// 				error: { message: 'Invalid request', code: -32600 },
// 			});
// 		});

// 		it('should respond with Internal error if "method" is missing', async () => {
// 			// Arrange
// 			const requestData = { jsonrpc: '2.0', id: 1234 };

// 			// Act
// 			const result = await requestHTTPServer(app.config.rpc, requestData);

// 			// Assert
// 			expect(result).toEqual({
// 				jsonrpc: '2.0',
// 				error: {
// 					message: 'Invalid request',
// 					code: -32600,
// 				},
// 				id: 1234,
// 			});
// 		});

// 		it('should respond with Internal error request if "method" invoked is invalid', async () => {
// 			// Arrange
// 			const requestData = { jsonrpc: '2.0', method: 'app_unknownMethod', id: 67879 };

// 			// Act
// 			const result = await requestHTTPServer(app.config.rpc, requestData);

// 			// Assert
// 			expect(result).toEqual({
// 				jsonrpc: '2.0',
// 				error: {
// 					message: 'Internal error',
// 					data: "Action 'app_unknownMethod' is not registered to bus.",
// 					code: -32603,
// 				},
// 				id: 67879,
// 			});
// 		});

// 		it('should respond to valid jsonrpc request', async () => {
// 			// Arrange
// 			const requestData = { jsonrpc: '2.0', method: 'app_getNodeInfo', id: 6729833 };

// 			// Act
// 			const result = await requestHTTPServer(app.config.rpc, requestData);

// 			// Assert
// 			expect(result).toContainAllKeys(['jsonrpc', 'id', 'result']);
// 			expect(result.jsonrpc).toEqual('2.0');
// 			expect(result.id).toEqual(6729833);
// 			expect(result.result).not.toBeUndefined();
// 		});
// 	});
// });
