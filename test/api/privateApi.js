/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
const popsicle = require('popsicle');
const privateApi = require('../../src/api/privateApi');

describe('privateApi module', () => {
	const port = 7000;
	const localNode = 'localhost';
	const externalNode = 'external';
	const sslNode = 'sslNode';
	const externalTestnetNode = 'testnet';
	const GET = 'GET';
	const POST = 'POST';
	const defaultMethod = POST;
	const defaultEndpoint = 'transactions';
	const defaultData = 'testData';
	const defaultNodes = [localNode, externalNode];
	const defaultSSLNodes = [localNode, externalNode, sslNode];
	const defaultTestnetNodes = [localNode, externalTestnetNode];

	let LSK;
	let sendRequestResult;
	let sendRequestStub;

	beforeEach(() => {
		LSK = {
			randomNode: false,
			node: localNode,
			defaultNodes: [].concat(defaultNodes),
			defaultSSLNodes: [].concat(defaultSSLNodes),
			defaultTestnetNodes: [].concat(defaultTestnetNodes),
			bannedNodes: [],
			port,
			options: {
				node: localNode,
			},
			nethash: {
				foo: 'bar',
			},

			parseOfflineRequests: () => ({
				requestMethod: GET,
			}),
			setTestnet: () => {},
			setNode: () => {},
			sendRequest: () => {},
		};
		sendRequestResult = { success: true, sendRequest: true };
		sendRequestStub = sandbox
			.stub(LSK, 'sendRequest')
			.resolves(Object.assign({}, sendRequestResult));
	});

	describe('#getNodes', () => {
		const { getNodes } = privateApi;

		describe('with SSL set to true', () => {
			beforeEach(() => {
				LSK.ssl = true;
			});

			it('should return default testnet nodes if testnet is set to true', () => {
				LSK.testnet = true;
				const nodes = getNodes.call(LSK);
				nodes.should.be.eql(defaultTestnetNodes);
			});

			it('should return default SSL nodes if testnet is not set to true', () => {
				LSK.testnet = false;
				const nodes = getNodes.call(LSK);
				nodes.should.be.eql(defaultSSLNodes);
			});
		});

		describe('with SSL set to false', () => {
			beforeEach(() => {
				LSK.ssl = false;
			});

			it('should return default testnet nodes if testnet is set to true', () => {
				LSK.testnet = true;
				const nodes = getNodes.call(LSK);
				nodes.should.be.eql(defaultTestnetNodes);
			});

			it('should return default mainnet nodes if testnet is not set to true', () => {
				LSK.testnet = false;
				const nodes = getNodes.call(LSK);
				nodes.should.be.eql(defaultNodes);
			});
		});
	});

	describe('#isBanned', () => {
		const { isBanned } = privateApi;
		it('should return true when provided node is banned', () => {
			LSK.bannedNodes = [].concat(defaultNodes);
			isBanned.call(LSK, localNode).should.be.true();
		});

		it('should return false when provided node is not banned', () => {
			LSK.bannedNodes = [];
			isBanned.call(LSK, localNode).should.be.false();
		});
	});

	describe('#getRandomNode', () => {
		const { getRandomNode } = privateApi;
		let getNodesStub;
		let restoreGetNodesStub;

		beforeEach(() => {
			getNodesStub = sandbox.stub().returns([].concat(defaultNodes));
			// eslint-disable-next-line no-underscore-dangle
			restoreGetNodesStub = privateApi.__set__('getNodes', getNodesStub);
		});

		afterEach(() => {
			restoreGetNodesStub();
		});

		it('should throw an error if all relevant nodes are banned', () => {
			LSK.bannedNodes = [].concat(defaultNodes);
			getRandomNode
				.bind(LSK)
				.should.throw(
					'Cannot get random node: all relevant nodes have been banned.',
				);
		});

		it('should get nodes', () => {
			getRandomNode.call(LSK);
			getNodesStub.should.be.calledOn(LSK);
		});

		it('should return a node', () => {
			const result = getRandomNode.call(LSK);
			LSK.defaultNodes.should.containEql(result);
		});

		it('should randomly select the node', () => {
			const firstResult = getRandomNode.call(LSK);
			let nextResult = getRandomNode.call(LSK);
			// Test will almost certainly time out if not random
			while (nextResult === firstResult) {
				nextResult = getRandomNode.call(LSK);
			}
		});
	});

	describe('#selectNewNode', () => {
		const { selectNewNode } = privateApi;
		const customNode = 'customNode';
		const getRandomNodeResult = externalNode;

		let getRandomNodeStub;
		let restoreGetRandomNode;

		beforeEach(() => {
			getRandomNodeStub = sandbox.stub().returns(getRandomNodeResult);
			// eslint-disable-next-line no-underscore-dangle
			restoreGetRandomNode = privateApi.__set__(
				'getRandomNode',
				getRandomNodeStub,
			);
		});

		afterEach(() => {
			restoreGetRandomNode();
		});

		describe('if a node was provided in the options', () => {
			beforeEach(() => {
				LSK.options.node = customNode;
			});
			describe('if randomNode is set to false', () => {
				beforeEach(() => {
					LSK.randomNode = false;
				});

				it('should throw an error if the provided node is banned', () => {
					LSK.bannedNodes = [customNode];
					selectNewNode
						.bind(LSK)
						.should.throw(
							'Cannot select node: provided node has been banned and randomNode is not set to true.',
						);
				});

				it('should return the provided node if it is not banned', () => {
					const result = selectNewNode.call(LSK);
					result.should.be.equal(customNode);
				});
			});

			describe('if randomNode is set to true', () => {
				beforeEach(() => {
					LSK.randomNode = true;
				});

				it('should call getRandomNode', () => {
					selectNewNode.call(LSK);
					getRandomNodeStub.should.be.calledOn(LSK);
				});

				it('should return a random node', () => {
					const result = selectNewNode.call(LSK);
					result.should.be.equal(getRandomNodeResult);
				});
			});
		});

		describe('if a node was not provided in the options', () => {
			beforeEach(() => {
				LSK.options.node = undefined;
			});

			describe('if randomNode is set to false', () => {
				beforeEach(() => {
					LSK.randomNode = false;
				});

				it('should throw an error', () => {
					selectNewNode
						.bind(LSK)
						.should.throw(
							'Cannot select node: no node provided and randomNode is not set to true.',
						);
				});
			});

			describe('if randomNode is set to true', () => {
				beforeEach(() => {
					LSK.randomNode = true;
				});

				it('should call getRandomNode', () => {
					selectNewNode.call(LSK);
					getRandomNodeStub.should.be.calledOn(LSK);
				});

				it('should return a random node', () => {
					const result = selectNewNode.call(LSK);
					result.should.be.equal(getRandomNodeResult);
				});
			});
		});
	});

	describe('#banActiveNode', () => {
		const { banActiveNode } = privateApi;
		let node;

		beforeEach(() => {
			node = LSK.node;
		});

		it('should add current node to banned nodes', () => {
			banActiveNode.call(LSK);

			LSK.bannedNodes.should.containEql(node);
		});

		it('should not duplicate a banned node', () => {
			const bannedNodes = [node];
			LSK.bannedNodes = bannedNodes;
			banActiveNode.call(LSK);

			LSK.bannedNodes.should.be.eql(bannedNodes);
		});
	});

	describe('#hasAvailableNodes', () => {
		const { hasAvailableNodes } = privateApi;
		let getNodesStub;
		let restoreGetNodesStub;

		beforeEach(() => {
			getNodesStub = sandbox.stub().returns([].concat(defaultNodes));
			// eslint-disable-next-line no-underscore-dangle
			restoreGetNodesStub = privateApi.__set__('getNodes', getNodesStub);
		});

		afterEach(() => {
			restoreGetNodesStub();
		});

		describe('with random node', () => {
			beforeEach(() => {
				LSK.randomNode = true;
			});

			it('should get nodes', () => {
				hasAvailableNodes.call(LSK);
				getNodesStub.should.be.calledOn(LSK);
			});

			it('should return false without nodes left', () => {
				LSK.defaultNodes = [];
				restoreGetNodesStub();
				const result = hasAvailableNodes.call(LSK);
				result.should.be.false();
			});
		});

		describe('without random node', () => {
			beforeEach(() => {
				LSK.randomNode = false;
			});

			it('should return false', () => {
				const result = hasAvailableNodes.call(LSK);
				result.should.be.false();
			});
		});
	});

	describe('#createRequestObject', () => {
		let options;
		let expectedObject;

		beforeEach(() => {
			options = {
				limit: 5,
				offset: 3,
				details: defaultData,
			};
			expectedObject = {
				method: GET,
				url: `http://${localNode}:${port}/api/${defaultEndpoint}`,
				headers: LSK.nethash,
				body: {},
			};
		});

		it('should create a valid request object for GET request', () => {
			expectedObject.url += `?limit=${options.limit}&offset=${options.offset}&details=${options.details}`;

			const requestObject = privateApi.createRequestObject.call(
				LSK,
				GET,
				defaultEndpoint,
				options,
			);
			requestObject.should.be.eql(expectedObject);
		});

		it('should create a valid request object for POST request', () => {
			expectedObject.body = Object.assign({}, options);
			expectedObject.method = POST;

			const requestObject = privateApi.createRequestObject.call(
				LSK,
				POST,
				defaultEndpoint,
				options,
			);
			requestObject.should.be.eql(expectedObject);
		});

		it('should create a valid request object for POST request without options', () => {
			expectedObject.method = POST;

			const requestObject = privateApi.createRequestObject.call(
				LSK,
				POST,
				defaultEndpoint,
			);
			requestObject.should.be.eql(expectedObject);
		});

		it('should create a valid request object for undefined request method without options', () => {
			expectedObject.method = undefined;

			const requestObject = privateApi.createRequestObject.call(
				LSK,
				undefined,
				defaultEndpoint,
			);
			requestObject.should.be.eql(expectedObject);
		});
	});

	describe('#sendRequestPromise', () => {
		const { sendRequestPromise } = privateApi;

		let options;
		let createRequestObjectResult;
		let createRequestObjectStub;
		let restoreCreateRequestObject;
		let sendRequestPromiseResult;

		beforeEach(() => {
			sandbox.stub(popsicle, 'request').returns({
				use: () => Promise.reject(new popsicle.PopsicleError('oh no')),
			});
			options = {
				key1: 'value 2',
				key3: 4,
			};
			createRequestObjectResult = {
				method: defaultMethod,
				url: `http://${localNode}:${port}/api/bad_endpoint?k=v`,
				headers: {},
				body: {},
			};
			createRequestObjectStub = sandbox
				.stub()
				.returns(Object.assign({}, createRequestObjectResult));
			// eslint-disable-next-line no-underscore-dangle
			restoreCreateRequestObject = privateApi.__set__(
				'createRequestObject',
				createRequestObjectStub,
			);
			sendRequestPromiseResult = sendRequestPromise
				.call(LSK, defaultMethod, defaultEndpoint, options)
				.catch(result => result);
			return sendRequestPromiseResult;
		});

		afterEach(() => {
			restoreCreateRequestObject();
		});

		it('should create a request object', () => {
			createRequestObjectStub.calledOn(LSK).should.be.true();
			createRequestObjectStub.should.be.calledWithExactly(
				defaultMethod,
				defaultEndpoint,
				options,
			);
		});

		it('should return the result of a popsicle request', () => {
			return sendRequestPromiseResult.then(result => {
				result.should.be.instanceof(popsicle.PopsicleError);
			});
		});
	});

	describe('#handleTimestampIsInFutureFailures', () => {
		const { handleTimestampIsInFutureFailures } = privateApi;
		let result;
		let options;

		beforeEach(() => {
			result = {
				success: false,
				message: 'Timestamp is in the future',
			};
			options = {
				key1: 'value 1',
				key2: 2,
				timeOffset: 40,
			};
		});

		it('should resolve the result if success is true', () => {
			result.success = true;
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.equal(result);
				});
		});

		it('should resolve the result if there is no message', () => {
			delete result.message;
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.equal(result);
				});
		});

		it('should resolve the result if the message is not about the timestamp being in the future', () => {
			result.message = 'Timestamp is in the past';
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.equal(result);
				});
		});

		it('should resolve the result if the time offset is greater than 40 seconds', () => {
			options.timeOffset = 41;
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.equal(result);
				});
		});

		it('should resend the request with a time offset of 10 seconds if all those conditions are met and the time offset is not specified', () => {
			delete options.timeOffset;
			const expectedOptions = Object.assign({}, options, {
				timeOffset: 10,
			});
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.be.eql(sendRequestResult);
					sendRequestStub.should.be.calledWithExactly(
						defaultMethod,
						defaultEndpoint,
						expectedOptions,
					);
				});
		});

		it('should resend the request with the time offset increased by 10 seconds if all those conditions are met and the time offset is specified', () => {
			const expectedOptions = Object.assign({}, options, {
				timeOffset: 50,
			});
			return handleTimestampIsInFutureFailures
				.call(LSK, defaultMethod, defaultEndpoint, options, result)
				.then(returnValue => {
					returnValue.should.be.eql(sendRequestResult);
					sendRequestStub.should.be.calledWithExactly(
						defaultMethod,
						defaultEndpoint,
						expectedOptions,
					);
				});
		});
	});

	describe('#handleSendRequestFailures', () => {
		const { handleSendRequestFailures } = privateApi;

		let options;
		let error;
		let setNodeSpy;
		let banActiveNodeSpy;
		let restorebanActiveNodeSpy;
		let hasAvailableNodesStub;
		let restorehasAvailableNodesStub;

		beforeEach(() => {
			options = {
				key1: 'value 1',
				key2: 2,
			};
			error = new Error('Test error.');
			setNodeSpy = sandbox.spy(LSK, 'setNode');
			banActiveNodeSpy = sandbox.spy();
			// eslint-disable-next-line no-underscore-dangle
			restorebanActiveNodeSpy = privateApi.__set__(
				'banActiveNode',
				banActiveNodeSpy,
			);
		});

		afterEach(() => {
			restorebanActiveNodeSpy();
		});

		describe('if a redial is possible', () => {
			beforeEach(() => {
				hasAvailableNodesStub = sandbox.stub().returns(true);
				// eslint-disable-next-line no-underscore-dangle
				restorehasAvailableNodesStub = privateApi.__set__(
					'hasAvailableNodes',
					hasAvailableNodesStub,
				);
			});

			afterEach(() => {
				restorehasAvailableNodesStub();
			});

			it('should ban the node with options randomNode true', () => {
				LSK.randomNode = true;
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(() => {
						banActiveNodeSpy.should.be.calledOn(LSK);
					});
			});

			it('should not ban the node with options randomNode false', () => {
				LSK.randomNode = false;
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(() => {
						banActiveNodeSpy.should.not.be.calledOn(LSK);
					});
			});

			it('should set a new node', () => {
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(() => {
						setNodeSpy.should.be.calledOnce();
					});
			});

			it('should send the request again with the same arguments', () => {
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(() => {
						sendRequestStub.should.be.calledWithExactly(
							defaultMethod,
							defaultEndpoint,
							options,
						);
					});
			});

			it('should resolve to the result of the request', () => {
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(result => {
						result.should.be.eql(sendRequestResult);
					});
			});
		});

		describe('if no redial is possible', () => {
			beforeEach(() => {
				hasAvailableNodesStub = sandbox
					.stub(privateApi, 'hasAvailableNodes')
					.returns(false);
			});

			it('should resolve to an object with success set to false', () => {
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(result => {
						result.should.have.property('success').and.be.equal(false);
					});
			});

			it('should resolve to an object with the provided error if no redial is possible', () => {
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(result => {
						result.should.have.property('error').and.be.equal(error);
					});
			});

			it('should resolve to an object with a helpful message', () => {
				return handleSendRequestFailures
					.call(LSK, defaultMethod, defaultEndpoint, options, error)
					.then(result => {
						result.should.have
							.property('message')
							.and.be.equal(
								'Could not create an HTTP request to any known nodes.',
							);
					});
			});
		});
	});
});
