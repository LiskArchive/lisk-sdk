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

const { AssertionError } = require('assert');
const ApplicationState = require('../../../../../src/controller/application_state');

jest.mock('os', () => ({
	platform: jest.fn(() => 'platform'),
	release: jest.fn(() => 'release'),
}));

describe('Application State', () => {
	let applicationState;
	const initialState = {
		version: '1.0.0-beta.3',
		wsPort: '3001',
		httpPort: '3000',
		minVersion: '1.0.0-beta.0',
		protocolVersion: '1.0',
		nethash: 'test broadhash',
		nonce: 'test nonce',
	};
	const mockedState = {
		os: 'platformrelease',
		version: '1.0.0-beta.3',
		wsPort: '3001',
		httpPort: '3000',
		minVersion: '1.0.0-beta.0',
		protocolVersion: '1.0',
		nethash: 'test broadhash',
		broadhash: 'test broadhash',
		height: 1,
		nonce: 'test nonce',
	};
	const logger = {
		debug: jest.fn(),
		error: jest.fn(),
	};

	const channel = {
		publish: jest.fn(),
	};

	beforeEach(() => {
		// Act
		applicationState = new ApplicationState({
			initialState,
			logger,
		});
	});

	describe('#constructor', () => {
		it('should initiate the application state', () => {
			// Assert
			expect(applicationState.logger).toBe(logger);
			expect(applicationState.stateChannel).toBe(undefined);
			expect(applicationState.state).toEqual(mockedState);
		});
	});

	describe('#get state', () => {
		it('should get the sate', () => {
			// Act
			const state = applicationState.state;

			// Assert
			expect(state).toEqual(mockedState);
		});
	});

	describe('#set channel', () => {
		it('should set the channel', () => {
			// Act
			applicationState.channel = channel;

			// Assert
			expect(applicationState.stateChannel).toBe(channel);
		});
	});

	describe('#update', () => {
		describe('when there is an error', () => {
			// Arrange
			const newState = {
				broadhash: 'xxx',
				height: '10',
			};
			const errorMessage = new Error('Publish failure');

			beforeEach(() => {
				applicationState.channel = {
					publish: jest
						.fn()
						.mockImplementation(() => Promise.reject(errorMessage)),
				};
			});

			it('should throw an error', () => {
				// Act && Assert
				return expect(applicationState.update(newState)).rejects.toThrow(
					errorMessage
				);
			});

			it('should log the error stack', async () => {
				try {
					await applicationState.update(newState);
				} catch (error) {
					expect(logger.error).toHaveBeenCalled();
					expect(logger.error).toHaveBeenLastCalledWith(error.stack);
				}
			});
		});

		describe('when wrong parameters are passed', () => {
			let newState;
			const broadhashErrorMessage =
				'broadhash is required to update application state.';
			const heightErrorMessage =
				'height is required to update application state.';

			it('should throw AssertionError if broadhash undefined', async () => {
				// Arrange
				newState = {
					broadhash: undefined,
					height: '10',
				};
				const broadhashAssertionError = new AssertionError({
					message: broadhashErrorMessage,
					operator: '==',
					expected: true,
					actual: undefined,
				});

				// Act && Assert
				await expect(applicationState.update(newState)).rejects.toThrow(
					broadhashAssertionError
				);
			});

			it('should throw AssertionError if broadhash is null', async () => {
				// Arrange
				newState = {
					broadhash: null,
					height: '10',
				};
				const broadhashAssertionError = new AssertionError({
					message: broadhashErrorMessage,
					operator: '==',
					expected: true,
					actual: null,
				});

				// Act && Assert
				await expect(applicationState.update(newState)).rejects.toThrow(
					broadhashAssertionError
				);
			});

			it('should throw AssertionError if height undefined', async () => {
				// Arrange
				newState = {
					broadhash: 'newBroadhash',
					height: undefined,
				};
				const heightAssertionError = new AssertionError({
					message: heightErrorMessage,
					operator: '==',
					expected: true,
					actual: undefined,
				});

				// Act && Assert
				await expect(applicationState.update(newState)).rejects.toThrow(
					heightAssertionError
				);
			});

			it('should throw AssertionError if height is null', async () => {
				// Arrange
				newState = {
					broadhash: 'newBroadhash',
					height: null,
				};
				const heightAssertionError = new AssertionError({
					message: heightErrorMessage,
					operator: '==',
					expected: true,
					actual: null,
				});

				// Act && Assert
				await expect(applicationState.update(newState)).rejects.toThrow(
					heightAssertionError
				);
			});
		});

		describe('when correct parameters are passed', () => {
			let newState;
			let result;
			let spies;
			let updatedState;

			beforeEach(async () => {
				// Arrange
				newState = {
					broadhash: 'newBroadhash',
					height: '10',
				};
				applicationState.channel = channel;
				spies = {
					get: jest.spyOn(applicationState, 'state', 'get'),
				};

				// Act
				result = await applicationState.update(newState);
				updatedState = applicationState.state;
			});

			it('should call get four times', async () => {
				// Assert
				expect(spies.get).toHaveBeenCalledTimes(4);
			});

			it('should update broadhash', async () => {
				// Assert
				expect(updatedState.broadhash).toBe(newState.broadhash);
			});

			it('should update height', async () => {
				// Assert
				expect(updatedState.height).toBe(newState.height);
			});

			it('should print notification update in logs', async () => {
				// Assert
				expect(logger.debug).toHaveBeenCalled();
				expect(logger.debug).toHaveBeenLastCalledWith(
					'Application state',
					updatedState
				);
			});

			it('should publish notification update on the channel', async () => {
				// Assert
				expect(channel.publish).toHaveBeenCalled();
				expect(channel.publish).toHaveBeenLastCalledWith(
					'app:state:updated',
					updatedState
				);
			});

			it('should return true', async () => {
				// Assert
				expect(result).toBe(true);
			});
		});
	});
});
