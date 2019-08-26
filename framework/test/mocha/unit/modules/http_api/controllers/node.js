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

'use strict';

const rewire = require('rewire');

const NodeController = rewire(
	'../../../../../../src/modules/http_api/controllers/node',
);

describe('node/api', () => {
	const confirmedTransactions = 10;

	let library;
	let privateLibrary;
	let channelStub;
	let cacheStub;
	let loggerStub;
	let storageStub;
	let configStub;
	let getStatus;
	let getNetworkHeight;

	before(async () => {
		channelStub = {
			invoke: sinonSandbox.stub().resolves(),
		};

		loggerStub = {
			warn: sinonSandbox.stub(),
		};

		cacheStub = {
			cacheReady: sinonSandbox.stub(),
		};

		storageStub = {
			entities: {
				Block: {
					get: sinonSandbox.stub().resolves([]),
				},
				Transaction: {
					count: sinonSandbox.stub().resolves(confirmedTransactions),
				},
			},
		};

		library = {
			components: {
				storage: storageStub,
				cache: cacheStub,
				logger: loggerStub,
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
		getNetworkHeight = NodeController.__get__('_getNetworkHeight');
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		describe('library', () => {
			it('should assign storage', () => {
				return expect(privateLibrary).to.have.nested.property(
					'components.storage',
					library.components.storage,
				);
			});

			it('should assign config', () => {
				return expect(privateLibrary).to.have.property(
					'config',
					library.config,
				);
			});

			it('should assign channel', () => {
				return expect(privateLibrary).to.have.property(
					'channel',
					library.channel,
				);
			});

			it('should assign applicationState', () => {
				return expect(privateLibrary).to.have.property(
					'applicationState',
					library.applicationState,
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
			syncing: false,
			unconfirmedTransactions: {
				ready: 0,
				verified: 0,
				pending: 0,
				validated: 0,
				received: 0,
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
				confirmed: confirmedTransactions,
				ready: 0,
				verified: 0,
				pending: 0,
				validated: 0,
				received: 0,
				total: 10,
			},
			currentTime: now,
		};

		const defaultPeers = [
			{
				height: 456,
			},
			{
				height: 457,
			},
			{
				height: 456,
			},
			{
				height: 453,
			},
		];

		beforeEach(async () => {
			sinonSandbox.stub(Date, 'now').returns(now);
		});

		describe('when chain:getNodeStatus answers with all parameters', () => {
			beforeEach(async () => {
				channelStub.invoke.withArgs('chain:getNodeStatus').returns(status);
				channelStub.invoke.withArgs('network:getPeers').returns(defaultPeers);
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
				channelStub.invoke
					.withArgs('chain:getNodeStatus')
					.returns(statusWithoutSomeParameters);
				channelStub.invoke.withArgs('network:getPeers').returns(defaultPeers);
			});

			it('should return an object status with some properties to 0', async () =>
				getStatus(null, (err, response) => {
					expect(err).to.be.null;
					expect(response).to.deep.equal(expectedStatusWithoutSomeParameters);
				}));
		});
	});

	describe('_networkHeight', () => {
		const MAJORITY_HEIGHT = 456;

		let networkHeight;
		describe('When there are set of majority peers with same height', () => {
			beforeEach(async () => {
				const defaultPeers = [
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: 457,
					},
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: 453,
					},
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: 438,
					},
				];
				channelStub.invoke.withArgs('network:getPeers').returns(defaultPeers);
				networkHeight = await getNetworkHeight();
			});

			it('should return correct networkHeight based on majority', async () => {
				expect(networkHeight).to.be.eql(MAJORITY_HEIGHT);
			});
		});

		describe('When network:getPeers returns a blank list of peers', () => {
			beforeEach(async () => {
				channelStub.invoke.withArgs('network:getPeers').returns([]);
				networkHeight = await getNetworkHeight();
			});

			it('should return zero when there are no peers with height', async () => {
				expect(networkHeight).to.be.eql(0);
			});
		});

		describe('When network:getPeers returns a list of peers with 2 different equal set of peers height', () => {
			beforeEach(async () => {
				const defaultPeers = [
					{
						height: MAJORITY_HEIGHT + 1,
					},
					{
						height: MAJORITY_HEIGHT + 1,
					},
					{
						height: MAJORITY_HEIGHT + 1,
					},
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: MAJORITY_HEIGHT,
					},
				];
				channelStub.invoke.withArgs('network:getPeers').returns(defaultPeers);
				networkHeight = await getNetworkHeight();
			});

			it('should return height of majority with lower height', async () => {
				expect(networkHeight).to.be.eql(MAJORITY_HEIGHT);
			});
		});

		describe('When network:getPeers returns a list of peers with 3 different equal set of peers height', () => {
			beforeEach(async () => {
				const defaultPeers = [
					{
						height: MAJORITY_HEIGHT + 2,
					},
					{
						height: MAJORITY_HEIGHT + 2,
					},
					{
						height: MAJORITY_HEIGHT + 2,
					},
					{
						height: MAJORITY_HEIGHT + 1,
					},
					{
						height: MAJORITY_HEIGHT + 1,
					},
					{
						height: MAJORITY_HEIGHT + 1,
					},
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: MAJORITY_HEIGHT,
					},
				];
				channelStub.invoke.withArgs('network:getPeers').returns(defaultPeers);
				networkHeight = await getNetworkHeight();
			});

			it('should return height of majority with lower height', async () => {
				expect(networkHeight).to.be.eql(MAJORITY_HEIGHT);
			});
		});

		describe('When network:getPeers returns a list of peers with 2 different unequal set of peers height', () => {
			beforeEach(async () => {
				const defaultPeers = [
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: MAJORITY_HEIGHT + 1,
					},
					{
						height: MAJORITY_HEIGHT + 1,
					},
					{
						height: MAJORITY_HEIGHT + 1,
					},
					{
						height: MAJORITY_HEIGHT + 1,
					},
				];
				channelStub.invoke.withArgs('network:getPeers').returns(defaultPeers);
				networkHeight = await getNetworkHeight();
			});

			it('should return height of majority', async () => {
				expect(networkHeight).to.be.eql(MAJORITY_HEIGHT + 1);
			});
		});

		describe('When network:getPeers returns only one peer', () => {
			beforeEach(async () => {
				const defaultPeers = [
					{
						height: MAJORITY_HEIGHT,
					},
				];
				channelStub.invoke.withArgs('network:getPeers').returns(defaultPeers);
				networkHeight = await getNetworkHeight();
			});

			it('should return height of one peer', async () => {
				expect(networkHeight).to.be.eql(MAJORITY_HEIGHT);
			});
		});

		describe('When network:getPeers returns majority of peers with very low height compared to others', () => {
			beforeEach(async () => {
				const defaultPeers = [
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: MAJORITY_HEIGHT,
					},
					{
						height: 1,
					},
					{
						height: 1,
					},
					{
						height: 1,
					},
					{
						height: 1,
					},
				];
				channelStub.invoke.withArgs('network:getPeers').returns(defaultPeers);
				networkHeight = await getNetworkHeight();
			});

			it('should return height of the majority even though its very low compared to others', async () => {
				expect(networkHeight).to.be.eql(1);
			});
		});
	});

	describe('getForgingStatus', () => {});

	describe('updateForgingStatus', () => {});

	describe('getPooledTransactions', () => {});

	describe('_getForgingStatus', () => {});
});
