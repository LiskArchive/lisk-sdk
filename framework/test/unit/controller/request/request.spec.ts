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

import { Request } from '../../../../src/controller/request';
import {
	ACTION_NAME,
	NAMESPACE,
	INVALID_ACTION_NAME_ARG,
	VALID_ACTION_NAME_ARG,
	PARAMS,
} from './constants';

describe('Request class', () => {
	describe('#constructor', () => {
		it('should throw an error when invalid name was provided.', () => {
			// Act & Assert
			expect(() => new Request(0, INVALID_ACTION_NAME_ARG)).toThrow(
				`Request name "${INVALID_ACTION_NAME_ARG}" must be a valid name with module name and action name.`,
			);
		});

		it('should throw error with control characters', () => {
			// Act & Assert
			expect(() => new Request(0, 'invalid char \n\r \t')).toThrow(
				`Request name "invalid char  " must be a valid name with module name and action name.`,
			);
		});

		it('should initialize the instance correctly when valid arguments were provided.', () => {
			// Act
			const action = new Request(0, VALID_ACTION_NAME_ARG, PARAMS);

			// Assert
			expect(action.namespace).toBe(NAMESPACE);
			expect(action.name).toBe(ACTION_NAME);
			expect(action.params).toBe(PARAMS);
		});
	});

	describe('methods', () => {
		let action: Request;
		beforeEach(() => {
			// Arrange
			action = new Request(0, VALID_ACTION_NAME_ARG, PARAMS);
		});

		describe('#toJSONRPCRequest', () => {
			it('should return jsonrpc object.', () => {
				// Arrange
				const expectedResult = {
					id: 0,
					jsonrpc: '2.0',
					method: `${NAMESPACE}_${ACTION_NAME}`,
					params: { ...PARAMS },
				};

				// Act
				const serializedRequest = action.toJSONRPCRequest();

				// Assert
				expect(serializedRequest).toEqual(expectedResult);
			});
		});

		describe('static #fromJSONRPCRequest', () => {
			it('should return action instance for given jsonrpc string.', () => {
				// Arrange
				const requestObject = {
					jsonrpc: '2.0',
					id: 1,
					method: 'module_action',
					params: {},
				};
				const requestStr = JSON.stringify(requestObject);

				// Act
				// eslint-disable-next-line @typescript-eslint/no-shadow
				const action = Request.fromJSONRPCRequest(requestStr);

				// Assert
				expect(action).toBeInstanceOf(Request);
				expect(action.namespace).toBe(NAMESPACE);
				expect(action.name).toBe(ACTION_NAME);
				expect(action.params).toEqual(PARAMS);
			});

			it('should return action instance for given jsonrpc request object.', () => {
				// Arrange
				const requestObject = {
					jsonrpc: '2.0',
					id: 1,
					method: 'module_action',
					params: {},
				};

				// Act
				// eslint-disable-next-line @typescript-eslint/no-shadow
				const action = Request.fromJSONRPCRequest(requestObject);

				// Assert
				expect(action).toBeInstanceOf(Request);
				expect(action.namespace).toBe(NAMESPACE);
				expect(action.name).toBe(ACTION_NAME);
				expect(action.params).toEqual(PARAMS);
			});
		});

		describe('#key', () => {
			it('should return method name.', () => {
				// Arrange
				const expectedResult = `${NAMESPACE}_${ACTION_NAME}`;

				// Act
				const key = action.key();

				// Assert
				expect(key).toBe(expectedResult);
			});
		});
	});
});
