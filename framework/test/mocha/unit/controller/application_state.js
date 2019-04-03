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

'use strict';

const crypto = require('crypto');

const ApplicationState = require('../../../../src/controller/application_state');

describe('application state', () => {
	let applicationState;
	let loggerStub;
	let dummyConfig;
	let channelMock;

	beforeEach(async () => {
		// Library
		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

		dummyConfig = {
			height: 1,
			nethash: 'test broadhash',
			version: '1.0.0-beta.3',
			wsPort: '3001',
			httpPort: '3000',
			minVersion: '1.0.0-beta.0',
			protocolVersion: '1.0',
			nonce: 'test nonce',
		};

		dummyConfig.broadhash = dummyConfig.nethash;

		channelMock = {
			publish: sinonSandbox.stub(),
		};

		applicationState = new ApplicationState({
			initialState: dummyConfig,
			logger: loggerStub,
		});
		applicationState.channel = channelMock;
	});

	describe('update()', () => {
		describe('when bad argument blocks is passed', () => {
			it('should throw TypeError', async () => {
				try {
					await applicationState.update();
				} catch (error) {
					expect(error).to.be.an('error');
					expect(error.message).to.equal('Argument blocks should be an array.');
				}
			});
		});

		describe('when empty array is passed', () => {
			it('should return true', async () => {
				const result = await applicationState.update([]);
				expect(result).to.be.true;
			});

			it('should update state.broadhash property to state.nethash', async () => {
				await applicationState.update([]);
				const state = applicationState.state;
				expect(state.broadhash).to.equal(state.nethash);
			});
		});

		describe('when only one single block is passed', () => {
			const blocks = [
				{
					id: '00000002',
					height: 2,
				},
			];

			it('should return true', async () => {
				const result = await applicationState.update(blocks);
				expect(result).to.be.true;
			});

			it('should update state.broadhash property to state.nethash', async () => {
				await applicationState.update(blocks);
				const state = applicationState.state;
				expect(state.broadhash).to.equal(state.nethash);
			});
		});

		describe('when more than one block are passed', () => {
			const blocks = [
				{
					id: '00000002',
					height: 2,
				},
				{
					id: '00000001',
					height: 1,
				},
			];

			beforeEach(async () => {
				channelMock.publish.returns();
			});

			it('should return true', async () => {
				const result = await applicationState.update(blocks);
				expect(result).to.be.true;
			});

			it('should update state.broadhash property to the just calculated broadhash', async () => {
				await applicationState.update(blocks);
				const state = applicationState.state;
				const seed = blocks.map(row => row.id).join('');
				const newBroadhash = crypto
					.createHash('sha256')
					.update(seed, 'utf8')
					.digest()
					.toString('hex');
				expect(state.broadhash).to.equal(newBroadhash);
			});

			it('should update state.height property to the best height', async () => {
				await applicationState.update(blocks);
				const state = applicationState.state;
				expect(state.height).to.equal(blocks[0].height);
			});

			it('should call the logger.debug Application state info', async () => {
				await applicationState.update(blocks);
				const state = applicationState.state;
				expect(loggerStub.debug.called).to.be.true;
				expect(loggerStub.debug.args[0][0]).to.equal('Application state');
				expect(loggerStub.debug.args[0][1]).to.eql(state);
			});
		});
	});
});
