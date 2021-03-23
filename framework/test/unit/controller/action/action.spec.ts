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

import { Action } from '../../../../src/controller/action';
import {
	ACTION_NAME,
	MODULE_NAME,
	INVALID_ACTION_NAME_ARG,
	VALID_ACTION_NAME_ARG,
	PARAMS,
} from './constants';

describe('Action class', () => {
	describe('#constructor', () => {
		it('should throw an error when invalid name was provided.', () => {
			// Act & Assert
			expect(() => new Action(0, INVALID_ACTION_NAME_ARG)).toThrow(
				`Action name "${INVALID_ACTION_NAME_ARG}" must be a valid name with module name and action name.`,
			);
		});

		it('should initialize the instance correctly when valid arguments were provided.', () => {
			// Act
			const action = new Action(0, VALID_ACTION_NAME_ARG, PARAMS);

			// Assert
			expect(action.module).toBe(MODULE_NAME);
			expect(action.name).toBe(ACTION_NAME);
			expect(action.params).toBe(PARAMS);
		});
	});

	describe('methods', () => {
		let action: Action;
		beforeEach(() => {
			// Arrange
			action = new Action(0, VALID_ACTION_NAME_ARG, PARAMS);
		});

		describe('#toJSONRPCRequest', () => {
			it('should return jsonrpc object.', () => {
				// Arrange
				const expectedResult = {
					id: 0,
					jsonrpc: '2.0',
					method: `${MODULE_NAME}:${ACTION_NAME}`,
					params: { ...PARAMS },
				};

				// Act
				const serializedAction = action.toJSONRPCRequest();

				// Assert
				expect(serializedAction).toEqual(expectedResult);
			});
		});

		describe('static #fromJSONRPCRequest', () => {
			it('should return action instance for given jsonrpc string.', () => {
				// Arrange
				const requestObject = {
					jsonrpc: '2.0',
					id: 1,
					method: 'module:action',
					params: {},
				};
				const requestStr = JSON.stringify(requestObject);

				// Act
				// eslint-disable-next-line @typescript-eslint/no-shadow
				const action = Action.fromJSONRPCRequest(requestStr);

				// Assert
				expect(action).toBeInstanceOf(Action);
				expect(action.module).toBe(MODULE_NAME);
				expect(action.name).toBe(ACTION_NAME);
				expect(action.params).toEqual(PARAMS);
			});

			it('should return action instance for given jsonrpc request object.', () => {
				// Arrange
				const requestObject = {
					jsonrpc: '2.0',
					id: 1,
					method: 'module:action',
					params: {},
				};

				// Act
				// eslint-disable-next-line @typescript-eslint/no-shadow
				const action = Action.fromJSONRPCRequest(requestObject);

				// Assert
				expect(action).toBeInstanceOf(Action);
				expect(action.module).toBe(MODULE_NAME);
				expect(action.name).toBe(ACTION_NAME);
				expect(action.params).toEqual(PARAMS);
			});
		});

		describe('#key', () => {
			it('should return method name.', () => {
				// Arrange
				const expectedResult = `${MODULE_NAME}:${ACTION_NAME}`;

				// Act
				const key = action.key();

				// Assert
				expect(key).toBe(expectedResult);
			});
		});
	});
});
