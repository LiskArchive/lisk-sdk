/*
 * Copyright © 2018 Lisk Foundation
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

const ApplicationState = require('../../../../../src/controller/application_state');

jest.mock('os');
jest.mock('lodash');

describe('Application State', () => {
	let applicationState = null;
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
		os: 'OS',
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
		error: jest.fn(),
	};

	const channel = {
		channel: jest.fn(),
	};

	beforeEach(() => {
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
			expect(applicationState.state).toBe(mockedState);
		});
	});

	describe('#get state', () => {
		it('should return a copy of the state', () => {
			const spy = jest.spyOn(ApplicationState, 'state', 'get');
			const state = ApplicationState.state;
			expect(state).toBe(mockedState);
			expect(spy).toHaveBeenCalledTimes(1);
			spy.mockRestore();
		});
	});

	describe('#set channel', () => {
		it('should set the channel', () => {
			applicationState.channel = channel;
			// Assert
			expect(applicationState.stateChannel).toBe(channel);
		});
	});

	describe('#update', () => {
		it.todo('should return error if problems in the db');
		it.todo('should update broadhash');
		it.todo('should update height');
		it.todo('should print state update in logs');
		it.todo('should publish state update');
	});
});
