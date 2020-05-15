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
import { AssertionError } from 'assert';
import { ApplicationState } from '../../../../src/application/application_state';

jest.mock('os', () => ({
	platform: jest.fn(() => 'platform'),
	release: jest.fn(() => 'release'),
}));

describe('Application State', () => {
	let applicationState: ApplicationState;
	const initialState = {
		blockVersion: 0,
		version: '1.0.0-beta.3',
		wsPort: 3001,
		protocolVersion: '1.0',
		networkId: 'test networkId',
		maxHeightPrevoted: 0,
		height: 1,
		os: 'platformrelease',
	};
	const mockedState = {
		blockVersion: 0,
		os: 'platformrelease',
		version: '1.0.0-beta.3',
		wsPort: 3001,
		protocolVersion: '1.0',
		networkId: 'test networkId',
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
			logger: logger as any,
		});
	});

	describe('#constructor', () => {
		it('should initiate the application state', () => {
			// Assert
			expect(applicationState['_logger']).toBe(logger);
			expect(applicationState['_channel']).toBeUndefined();
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
			applicationState.channel = channel as any;

			// Assert
			expect(applicationState['_channel']).toBe(channel);
		});
	});

	describe('#update', () => {
		describe('when there is an error', () => {
			// Arrange
			const newState = {
				maxHeightPrevoted: 0,
				height: 10,
			};
			const errorMessage = new Error('Publish failure');

			beforeEach(() => {
				applicationState.channel = {
					publish: jest.fn().mockImplementation(() => {
						throw errorMessage;
					}),
				} as any;
			});

			it('should throw an error', () => {
				// Act && Assert
				expect(() => applicationState.update(newState)).toThrow(errorMessage);
			});

			it('should log the error stack', () => {
				// Act && Assert
				expect(() => applicationState.update(newState)).toThrow(errorMessage);
				expect(logger.error).toHaveBeenLastCalledWith(
					{ err: errorMessage },
					'Failed to update application state',
				);
			});
		});

		describe('when wrong parameters are passed', () => {
			let newState: any;
			const heightErrorMessage =
				'height is required to update application state.';

			it('should throw AssertionError if height undefined', () => {
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
				expect(() => applicationState.update(newState)).toThrow(
					heightAssertionError,
				);
			});

			it('should throw AssertionError if height is null', () => {
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
				expect(() => applicationState.update(newState)).toThrow(
					heightAssertionError,
				);
			});
		});

		describe('when correct parameters are passed', () => {
			let newState: { height: number; maxHeightPrevoted: number };
			let updatedState: any;

			beforeEach(() => {
				// Arrange
				newState = {
					maxHeightPrevoted: 1,
					height: 10,
				};
				applicationState.channel = channel as any;

				// Act
				applicationState.update(newState);
				updatedState = applicationState.state;
			});

			it('should update maxHeightPrevoted', () => {
				// Assert
				expect(updatedState.maxHeightPrevoted).toBe(newState.maxHeightPrevoted);
			});

			it('should update height', () => {
				// Assert
				expect(updatedState.height).toBe(newState.height);
			});

			it('should print notification update in logs', () => {
				// Assert
				expect(logger.debug).toHaveBeenCalled();
				expect(logger.debug).toHaveBeenLastCalledWith(
					updatedState,
					'Update application state',
				);
			});

			it('should publish notification update on the channel', () => {
				// Assert
				expect(channel.publish).toHaveBeenCalled();
				expect(channel.publish).toHaveBeenLastCalledWith(
					'app:state:updated',
					updatedState,
				);
			});
		});

		describe('when a parameter is not passed', () => {
			let newState;
			let updatedState: any;

			beforeEach(() => {
				// Arrange
				newState = {
					height: 10,
				};
				applicationState.channel = channel as any;

				// Act
				applicationState.update(newState);
				updatedState = applicationState.state;
			});

			it('should remain with the same value', () => {
				// Assert
				expect(updatedState.maxHeightPrevoted).toBe(
					mockedState.maxHeightPrevoted,
				);
			});
		});
	});
});
