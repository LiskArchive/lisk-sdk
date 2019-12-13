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
		blockVersion: 0,
		version: '1.0.0-beta.3',
		wsPort: '3001',
		httpPort: '3000',
		minVersion: '1.0.0-beta.0',
		protocolVersion: '1.0',
		nethash: 'test nethash',
		maxHeightPrevoted: 0,
		height: 1,
		os: 'platformrelease',
	};
	const mockedState = {
		blockVersion: 0,
		os: 'platformrelease',
		version: '1.0.0-beta.3',
		wsPort: '3001',
		httpPort: '3000',
		minVersion: '1.0.0-beta.0',
		protocolVersion: '1.0',
		nethash: 'test nethash',
		maxHeightPrevoted: 0,
		height: 1,
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
			expect(applicationState.stateChannel).toBeUndefined();
			expect(applicationState.state).toEqual(mockedState);
		});
	});

	describe('#get state', () => {
		it('should get the sate', () => {
			// Act
			const { state } = applicationState;

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
				maxHeightPrevoted: 0,
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

			it('should throw an error', async () => {
				// Act && Assert
				await expect(applicationState.update(newState)).rejects.toThrow(
					errorMessage,
				);
			});

			it('should log the error stack', async () => {
				// Act && Assert
				await expect(applicationState.update(newState)).rejects.toThrow(
					errorMessage,
				);
				expect(logger.error).toHaveBeenLastCalledWith(errorMessage.stack);
			});
		});

		describe('when wrong parameters are passed', () => {
			let newState;
			const heightErrorMessage =
				'height is required to update application state.';

			it('should throw AssertionError if height undefined', async () => {
				// Arrange
				newState = {
					maxHeightPrevoted: 0,
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
					heightAssertionError,
				);
			});

			it('should throw AssertionError if height is null', async () => {
				// Arrange
				newState = {
					maxHeightPrevoted: 0,
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
					heightAssertionError,
				);
			});
		});

		describe('when correct parameters are passed', () => {
			let newState;
			let result;
			let updatedState;

			beforeEach(async () => {
				// Arrange
				newState = {
					maxHeightPrevoted: 1,
					height: '10',
				};
				applicationState.channel = channel;

				// Act
				result = await applicationState.update(newState);
				updatedState = applicationState.state;
			});

			it('should update maxHeightPrevoted', async () => {
				// Assert
				expect(updatedState.maxHeightPrevoted).toBe(newState.maxHeightPrevoted);
			});

			it('should update height', async () => {
				// Assert
				expect(updatedState.height).toBe(newState.height);
			});

			it('should print notification update in logs', async () => {
				// Assert
				expect(logger.debug).toHaveBeenCalled();
				expect(logger.debug).toHaveBeenLastCalledWith(
					updatedState,
					'Update application state',
				);
			});

			it('should publish notification update on the channel', async () => {
				// Assert
				expect(channel.publish).toHaveBeenCalled();
				expect(channel.publish).toHaveBeenLastCalledWith(
					'app:state:updated',
					updatedState,
				);
			});

			it('should return true', async () => {
				// Assert
				expect(result).toBe(true);
			});
		});

		describe('when a parameter is not passed', () => {
			let newState;
			let updatedState;

			beforeEach(async () => {
				// Arrange
				newState = {
					height: '10',
				};
				applicationState.channel = channel;

				// Act
				await applicationState.update(newState);
				updatedState = applicationState.state;
			});

			it('should remain with the same value', async () => {
				// Assert
				expect(updatedState.maxHeightPrevoted).toBe(
					mockedState.maxHeightPrevoted,
				);
			});
		});
	});
});
