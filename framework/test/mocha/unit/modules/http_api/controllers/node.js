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

const rewire = require('rewire');

const NodeController = rewire(
	'../../../../../../src/modules/http_api/controllers/node'
);

describe('node/api', () => {
	let library;
	let privateLibrary;
	let channelStub;
	let storageStub;
	let configStub;
	let getStatus;

	before(async () => {
		channelStub = {
			invoke: sinonSandbox.stub().resolves(),
		};

		storageStub = {
			entities: {
				Block: {
					get: sinonSandbox.stub().resolves([]),
				},
			},
		};

		library = {
			components: {
				storage: storageStub,
			},
			config: configStub,
			channel: channelStub,
			applicationState: {
				broadhash:
					'176caf53295f73a5a67a1fb56f31445392a3b8e8f11ed6167f323813001eb73b',
			},
		};

		new NodeController(library);

		privateLibrary = NodeController.__get__('library');
		getStatus = NodeController.getStatus;
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		describe('library', () => {
			it('should assign storage', () => {
				return expect(privateLibrary).to.have.nested.property(
					'components.storage',
					library.components.storage
				);
			});

			it('should assign config', () => {
				return expect(privateLibrary).to.have.property(
					'config',
					library.config
				);
			});

			it('should assign channel', () => {
				return expect(privateLibrary).to.have.property(
					'channel',
					library.channel
				);
			});

			it('should assign applicationState', () => {
				return expect(privateLibrary).to.have.property(
					'applicationState',
					library.applicationState
				);
			});
		});
	});

	describe('getConstants', () => {});

	describe('getStatus', () => {
		const status = {
			consensus: 100,
			secondsSinceEpoch: 89742345,
			lastBlock: {
				height: 1187,
			},
			loaded: true,
			networkHeight: 456,
			syncing: false,
			transactions: {
				confirmed: 10,
				unconfirmed: 0,
				unprocessed: 0,
				unsigned: 0,
				total: 10,
			},
		};

		const now = Date.now();

		const expectedStatus = {
			broadhash:
				'176caf53295f73a5a67a1fb56f31445392a3b8e8f11ed6167f323813001eb73b',
			consensus: 100,
			secondsSinceEpoch: 89742345,
			height: 1187,
			loaded: true,
			networkHeight: 456,
			syncing: false,
			transactions: {
				confirmed: 10,
				unconfirmed: 0,
				unprocessed: 0,
				unsigned: 0,
				total: 10,
			},
			currentTime: now,
		};

		beforeEach(async () => {
			sinonSandbox.stub(Date, 'now').returns(now);
		});

		describe('when chain:getNodeStatus answers with all parameters', () => {
			beforeEach(async () => {
				channelStub.invoke.withArgs('chain:getNodeStatus').returns(status);
			});

			it('should return an object status with all properties', async () =>
				getStatus(null, (err, response) => {
					expect(err).to.be.null;
					expect(response).to.deep.equal(expectedStatus);
				}));
		});

		describe('when chain:getNodeStatus answers without some parameters', () => {
			let statusWithoutSomeParameters;
			let expectedStatusWithoutSomeParameters;

			beforeEach(async () => {
				statusWithoutSomeParameters = _.cloneDeep(status);
				statusWithoutSomeParameters.consensus = undefined;
				statusWithoutSomeParameters.lastBlock.height = undefined;
				statusWithoutSomeParameters.networkHeight = undefined;
				expectedStatusWithoutSomeParameters = _.cloneDeep(expectedStatus);
				expectedStatusWithoutSomeParameters.consensus = 0;
				expectedStatusWithoutSomeParameters.height = 0;
				expectedStatusWithoutSomeParameters.networkHeight = 0;
				channelStub.invoke
					.withArgs('chain:getNodeStatus')
					.returns(statusWithoutSomeParameters);
			});

			it('should return an object status with some properties to 0', async () =>
				getStatus(null, (err, response) => {
					expect(err).to.be.null;
					expect(response).to.deep.equal(expectedStatusWithoutSomeParameters);
				}));
		});
	});

	describe('getForgingStatus', () => {});

	describe('updateForgingStatus', () => {});

	describe('getPooledTransactions', () => {});

	describe('_getForgingStatus', () => {});
});
