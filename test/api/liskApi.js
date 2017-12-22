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
import LiskAPI from 'api/liskApi';
import config from '../../config.json';

const privateApi = require('api/privateApi');
const utils = require('api/utils');

describe.only('Lisk API module', () => {
	const fixedPoint = 10 ** 8;
	const testPort = '7000';
	// const livePort = '8000';
	const sslPort = '443';
	const mainnetHash =
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
	const testnetHash =
		'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const defaultNethash = {
		'Content-Type': 'application/json',
		nethash: mainnetHash,
		broadhash: mainnetHash,
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: sslPort,
	};
	const testnetNethash = Object.assign({}, defaultNethash, {
		nethash: testnetHash,
		broadhash: testnetHash,
		port: testPort,
	});
	const customNethash = Object.assign({}, defaultNethash, {
		nethash: '123',
		version: '0.0.0a',
	});
	const defaultPassphrase = 'secret';
	const defaultSecondPassphrase = 'second secret';
	const GET = 'GET';
	const POST = 'POST';
	const defaultRequestLimit = 10;
	const defaultRequestOffset = 101;
	const defaultAmount = 1 * fixedPoint;
	const defaultOrderBy = 'rate:asc';
	const localNode = 'localhost';
	const externalNode = 'external';
	const sslNode = 'sslNode';
	const externalTestnetNode = 'testnet';
	const defaultNodes = [localNode, externalNode];
	const defaultSSLNodes = [localNode, externalNode, sslNode];
	const defaultTestnetNodes = [localNode, externalTestnetNode];
	const defaultBannedNodes = ['naughty1', 'naughty2', 'naughty3'];
	const defaultSelectedNode = 'selected_node';
	const defaultUrl = 'node.url.com';
	const defaultRequestPromiseResult = {
		body: {
			success: true,
		},
	};
	const defaultCheckedOptions = {
		key1: 'value1',
		key2: 2,
	};

	let selectNewNodeStub;
	let sendRequestPromiseStub;
	let checkOptionsStub;
	let handleTimestampIsInFutureFailuresStub;
	let handleSendRequestFailuresStub;
	let getFullURLStub;
	let LSK;

	beforeEach(() => {
		sendRequestPromiseStub = sandbox
			.stub(privateApi, 'sendRequestPromise')
			.resolves(Object.assign({}, defaultRequestPromiseResult));
		checkOptionsStub = sandbox
			.stub(utils, 'checkOptions')
			.returns(Object.assign({}, defaultCheckedOptions));
		handleTimestampIsInFutureFailuresStub = sandbox
			.stub(privateApi, 'handleTimestampIsInFutureFailures')
			.resolves(Object.assign({}, defaultRequestPromiseResult.body));
		handleSendRequestFailuresStub = sandbox.stub(
			privateApi,
			'handleSendRequestFailures',
		);
		getFullURLStub = sandbox.stub(utils, 'getFullURL').returns(defaultUrl);

		config.nodes.mainnet = defaultNodes;
		config.nodes.testnet = defaultTestnetNodes;
		LSK = new LiskAPI({});
	});

	describe('LiskAPI()', () => {
		it('should create a new instance of LiskAPI', () => {
			return LSK.should.be.type('object').and.be.instanceof(LiskAPI);
		});

		it('should set node string by default', () => {
			return LSK.should.have.property('node').and.be.type('string');
		});

		describe('with option testnet true', () => {
			beforeEach(() => {
				LSK = new LiskAPI({ testnet: true });
			});

			it('should set the port to 7000 on initialization', () => {
				return LSK.should.have.property('port').be.equal(testPort);
			});

			it('should set testnet to true on initialization', () => {
				return LSK.should.have.property('testnet').be.equal(true);
			});
		});
	});

	describe('on initialize', () => {
		describe('SSL', () => {
			it('should set SSL to true on initialization when no SSL options is passed', () => {
				return LSK.should.have.property('ssl').be.true();
			});

			it('should set SSL to false on initialization when passed as an option', () => {
				LSK = new LiskAPI({ ssl: false });
				return LSK.should.have.property('ssl').be.false();
			});

			it('should set SSL to true on initialization when passed as an option', () => {
				LSK = new LiskAPI({ ssl: true });
				return LSK.should.have.property('ssl').be.true();
			});
		});

		describe('randomizeNodes', () => {
			it('should set randomizeNodes to true when randomizeNodes not explicitly set', () => {
				return LSK.should.have.property('randomizeNodes').be.true();
			});

			it('should set randomizeNodes to true on initialization when passed as an option', () => {
				LSK = new LiskAPI({ randomizeNodes: true });
				return LSK.should.have.property('randomizeNodes').be.true();
			});

			it('should set randomizeNodes to false on initialization when passed as an option', () => {
				LSK = new LiskAPI({
					node: defaultSelectedNode,
					randomizeNodes: false,
				});
				return LSK.should.have.property('randomizeNodes').be.false();
			});
		});

		describe('port', () => {
			it('should set port to desired port if set on initialization when passed as an option', () => {
				LSK = new LiskAPI({ port: '2000' });
				return LSK.should.have.property('port').be.equal('2000');
			});

			it('should set port to default testnet port if not set but used testnet on initialization when passed as an option', () => {
				LSK = new LiskAPI({ port: undefined, testnet: true });
				return LSK.should.have.property('port').be.equal(testPort);
			});

			it('should set testnet true and port to 100 on initialization when passed as an option', () => {
				LSK = new LiskAPI({ port: '100', testnet: true });
				return LSK.should.have.property('port').be.equal('100');
			});
		});

		describe('nodes', () => {
			it('should set all nodes lists to provided nodes on initialization when passed as an option', () => {
				LSK = new LiskAPI({ nodes: defaultNodes });
				return LSK.should.have.property('nodes').be.eql(defaultNodes);
			});

			it('should set all bannedNodes list to provided bannedNodes on initialization when passed as an option', () => {
				LSK = new LiskAPI({ bannedNodes: defaultBannedNodes });
				return defaultBannedNodes.every(node =>
					LSK.isBanned(node).should.be.true(),
				);
			});

			it('should set node to provided node on initialization when passed as an option', () => {
				LSK = new LiskAPI({ node: defaultUrl });
				return LSK.should.have.property('node').be.equal(defaultUrl);
			});
		});
	});

	describe('get nodes', () => {
		let sslStub;
		let testnetStub;

		beforeEach(() => {
			sslStub = sandbox.stub(LSK, 'ssl');
			testnetStub = sandbox.stub(LSK, 'testnet');
		});

		describe('with SSL set to true', () => {
			it('should return default testnet nodes if testnet is set to true', () => {
				testnetStub.get(() => true);
				return LSK.nodes.should.be.eql(defaultTestnetNodes);
			});

			it('should return default SSL nodes if testnet is not set to true', () => {
				LSK = new LiskAPI({ nodes: defaultSSLNodes });
				return LSK.nodes.should.be.eql(defaultSSLNodes);
			});
		});

		describe('with SSL set to false', () => {
			beforeEach(() => {
				sslStub.get(() => false);
			});

			it('should return default testnet nodes if testnet is set to true', () => {
				testnetStub.get(() => true);
				return LSK.nodes.should.be.eql(defaultTestnetNodes);
			});

			it('should return default mainnet nodes if testnet is not set to true', () => {
				return LSK.nodes.should.be.eql(defaultNodes);
			});
		});
	});

	describe('#isBanned', () => {
		it('should return true when provided node is banned', () => {
			LSK = new LiskAPI({ bannedNodes: [localNode] });
			return LSK.isBanned(localNode).should.be.true();
		});

		it('should return false when provided node is not banned', () => {
			return LSK.isBanned(localNode).should.be.false();
		});
	});

	describe('get randomNode', () => {
		let nodesStub;

		beforeEach(() => {
			LSK = new LiskAPI();
			nodesStub = sandbox.stub(LSK, 'nodes');
			nodesStub.get(() => [...defaultNodes]);
		});

		it('should throw an error if all relevant nodes are banned', () => {
			try {
				defaultNodes.forEach(() => LSK.banActiveNode());
			} catch (error) {
				// Nothing
			}
			return (() => LSK.randomNode).should.throw(
				'Cannot get random node: all relevant nodes have been banned.',
			);
		});

		it('should return a node', () => {
			const result = LSK.randomNode;
			return defaultNodes.should.containEql(result);
		});

		it('should randomly select the node', () => {
			const firstResult = LSK.randomNode;
			let nextResult = LSK.randomNode;
			// Test will almost certainly time out if not random
			while (nextResult === firstResult) {
				nextResult = LSK.randomNode;
			}
		});
	});

	describe('#selectNewNode', () => {
		const customNode = 'customNode';
		const getRandomNodeResult = externalNode;

		beforeEach(() => {
			sandbox.stub(LSK, 'randomNode').get(() => getRandomNodeResult);
		});

		describe('if a node was provided in the options', () => {
			beforeEach(() => {
				LSK.providedNode = customNode;
			});
			describe('if randomizeNodes is set to false', () => {
				beforeEach(() => {
					LSK.randomizeNodes = false;
				});

				it('should throw an error if the provided node is banned', () => {
					LSK.banActiveNode();
					LSK.banActiveNode();
					return LSK.selectNewNode
						.bind(LSK)
						.should.throw(
							'Cannot select node: provided node has been banned and randomizeNodes is not set to true.',
						);
				});

				it('should return the provided node if it is not banned', () => {
					const result = LSK.selectNewNode();
					return result.should.be.equal(customNode);
				});
			});

			describe('if randomizeNodes is set to true', () => {
				beforeEach(() => {
					LSK.randomizeNodes = true;
				});

				it('should return a random node', () => {
					const result = LSK.selectNewNode();
					return result.should.be.equal(getRandomNodeResult);
				});
			});
		});

		describe('if a node was not provided in the options', () => {
			beforeEach(() => {
				LSK.providedNode = undefined;
			});

			describe('if randomizeNodes is set to false', () => {
				beforeEach(() => {
					LSK.randomizeNodes = false;
				});

				it('should throw an error', () => {
					return LSK.selectNewNode
						.bind(LSK)
						.should.throw(
							'Cannot select node: no node provided and randomizeNodes is not set to true.',
						);
				});
			});

			describe('if randomizeNodes is set to true', () => {
				beforeEach(() => {
					LSK.randomizeNodes = true;
				});

				it('should return a random node', () => {
					const result = LSK.selectNewNode();
					return result.should.be.equal(getRandomNodeResult);
				});
			});
		});
	});

	describe('#banActiveNode', () => {
		let node;

		beforeEach(() => {
			node = LSK.node;
		});

		it('should add current node to banned nodes', () => {
			LSK.banActiveNode();
			return LSK.isBanned(node).should.be.true();
		});

		it('should not duplicate a banned node', () => {
			const bannedNodes = [node];
			LSK.bannedNodes = bannedNodes;
			LSK.banActiveNode();

			return LSK.bannedNodes.should.be.eql(bannedNodes);
		});
	});

	describe('#hasAvailableNodes', () => {
		let nodesStub;

		beforeEach(() => {
			nodesStub = sandbox.stub(LSK, 'nodes');
			nodesStub.get(() => [].concat(defaultNodes));
		});

		describe('with randomized nodes', () => {
			beforeEach(() => {
				LSK.randomizeNodes = true;
			});

			it('should return false without nodes left', () => {
				nodesStub.get(() => []);
				const result = LSK.hasAvailableNodes();
				return result.should.be.false();
			});
		});

		describe('without randomized nodes', () => {
			beforeEach(() => {
				LSK.randomizeNodes = false;
			});

			it('should return false', () => {
				const result = LSK.hasAvailableNodes();
				return result.should.be.false();
			});
		});
	});

	describe('#getNethash', () => {
		it('should provide default mainnet nethash values', () => {
			return LSK.getNethash().should.eql(defaultNethash);
		});

		it('should provide default testnet nethash values', () => {
			LSK = new LiskAPI({ testnet: true });
			return LSK.getNethash().should.eql(testnetNethash);
		});

		it('should get values for a custom nethash', () => {
			return LSK.getNethash('123').should.be.eql(customNethash);
		});
	});

	describe('get allNodes', () => {
		let nodes;

		beforeEach(() => {
			nodes = LSK.allNodes;
		});

		it('should show the current node', () => {
			nodes.should.have.property('current').equal(LSK.node);
		});

		it('should list 2 default nodes', () => {
			nodes.should.have.property('default').have.length(2);
			return nodes.default.forEach(node => {
				node.should.be.type('string');
			});
		});

		it('should list 2 ssl nodes', () => {
			nodes.should.have.property('ssl').have.length(2);
			return nodes.ssl.forEach(node => {
				node.should.be.type('string');
			});
		});

		it('should list 2 testnet node', () => {
			nodes.should.have.property('testnet').have.length(2);
			return nodes.testnet.forEach(node => {
				node.should.be.type('string');
			});
		});
	});

	describe('set testnet', () => {
		beforeEach(() => {
			selectNewNodeStub = sandbox
				.stub(LSK, 'selectNewNode')
				.returns(defaultSelectedNode);
		});

		describe('to true', () => {
			beforeEach(() => {
				LSK.testnet = false;
			});

			it('should set testnet to true', () => {
				LSK.testnet = true;
				return LSK.should.have.property('testnet').and.be.true();
			});

			it('should set port to 7000', () => {
				LSK.testnet = true;
				return LSK.should.have.property('port').and.be.equal(testPort);
			});

			it('should select a node', () => {
				const callCount = selectNewNodeStub.callCount;
				LSK.testnet = true;
				return selectNewNodeStub.should.have.callCount(callCount + 1);
			});
		});

		describe('to false', () => {
			beforeEach(() => {
				LSK.testnet = true;
			});

			it('should set testnet to false', () => {
				LSK.testnet = false;
				return LSK.should.have.property('testnet').and.be.false();
			});

			it('should set port to 443', () => {
				LSK.testnet = false;
				return LSK.should.have.property('port').and.be.equal(sslPort);
			});

			it('should select a node', () => {
				const callCount = selectNewNodeStub.callCount;
				LSK.testnet = false;
				return selectNewNodeStub.should.have.callCount(callCount + 1);
			});
		});

		describe('banned nodes', () => {
			beforeEach(() => {
				defaultBannedNodes.forEach(() => LSK.banActiveNode());
			});

			describe('when initially on mainnet', () => {
				it('should reset banned nodes when switching from mainnet to testnet', () => {
					LSK.testnet = true;
					return defaultNodes.every(node =>
						LSK.isBanned(node).should.be.false(),
					);
				});

				it('should not reset banned nodes when switching from mainnet to mainnet', () => {
					const bannedNodes = defaultNodes.filter(node =>
						LSK.isBanned(node),
					);
					LSK.testnet = false;
					return bannedNodes.every(node =>
						LSK.isBanned(node).should.be.true(),
					);
				});
			});

			describe('when initially on testnet', () => {
				beforeEach(() => {
					LSK.testnet = true;
					defaultBannedNodes.forEach(() => LSK.banActiveNode());
				});

				it('should reset banned nodes when switching from testnet to mainnet', () => {
					LSK.testnet = false;
					return defaultNodes.every(node =>
						LSK.isBanned(node).should.be.false(),
					);
				});

				it('should not reset banned nodes when switching from testnet to testnet', () => {
					const bannedNodes = defaultNodes.filter(node =>
						LSK.isBanned(node),
					);
					LSK.testnet = true;
					return bannedNodes.every(node =>
						LSK.isBanned(node).should.be.true(),
					);
				});
			});
		});
	});

	describe('set ssl', () => {
		beforeEach(() => {
			selectNewNodeStub = sandbox
				.stub(LSK, 'selectNewNode')
				.returns(defaultSelectedNode);
		});

		describe('when ssl is initially true', () => {
			beforeEach(() => {
				LSK.ssl = true;
			});

			describe('when set to true', () => {
				it('should have ssl set to true', () => {
					LSK.ssl = true;
					return LSK.should.have.property('ssl').and.be.true();
				});

				it('should not change bannedNodes', () => {
					LSK.bannedNodes = [].concat(defaultBannedNodes);
					LSK.ssl = true;
					return LSK.should.have
						.property('bannedNodes')
						.and.eql(defaultBannedNodes);
				});

				it('should not select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.ssl = true;
					return selectNewNodeStub.should.have.callCount(callCount);
				});
			});

			describe('when set to false', () => {
				it('should have ssl set to false', () => {
					LSK.ssl = false;
					return LSK.should.have.property('ssl').and.be.false();
				});

				it('should reset bannedNodes', () => {
					defaultBannedNodes.forEach(() => LSK.banActiveNode());
					LSK.ssl = false;
					return defaultNodes.every(node =>
						LSK.isBanned(node).should.be.false(),
					);
				});

				it('should select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.ssl = false;
					return selectNewNodeStub.should.have.callCount(
						callCount + 1,
					);
				});
			});
		});

		describe('when ssl is initially false', () => {
			beforeEach(() => {
				LSK.ssl = false;
			});

			describe('when set to true', () => {
				it('should have ssl set to true', () => {
					LSK.ssl = true;
					return LSK.should.have.property('ssl').and.be.true();
				});

				it('should reset bannedNodes', () => {
					defaultBannedNodes.forEach(() => LSK.banActiveNode());
					LSK.ssl = true;
					return defaultNodes.every(node =>
						LSK.isBanned(node).should.be.false(),
					);
				});

				it('should select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.ssl = true;
					return selectNewNodeStub.should.have.callCount(
						callCount + 1,
					);
				});
			});

			describe('when set to false', () => {
				it('should have ssl set to false', () => {
					LSK.ssl = false;
					return LSK.should.have.property('ssl').and.be.false();
				});

				it('should not change bannedNodes', () => {
					LSK.bannedNodes = [].concat(defaultBannedNodes);
					LSK.ssl = false;
					return LSK.should.have
						.property('bannedNodes')
						.and.eql(defaultBannedNodes);
				});

				it('should select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.ssl = false;
					return selectNewNodeStub.should.have.callCount(callCount);
				});
			});
		});
	});

	describe('#broadcastSignedTransaction', () => {
		let transaction;
		let requestObject;

		beforeEach(() => {
			transaction = {
				key1: 'value1',
				key2: 2,
			};
			requestObject = {
				requestUrl: `${defaultUrl}/api/transactions`,
				nethash: defaultNethash,
				requestParams: { transaction },
			};
		});

		it('should use getFullURL to get the url', () => {
			return LSK.broadcastSignedTransaction({}).then(() => {
				getFullURLStub.should.be.calledWithExactly(LSK);
			});
		});

		it('should call sendRequestPromise with a prepared request object', () => {
			return LSK.broadcastSignedTransaction(transaction).then(() => {
				sendRequestPromiseStub.should.be.calledOn(LSK);
				sendRequestPromiseStub.should.be.calledWithExactly(
					POST,
					requestObject,
				);
			});
		});

		it('should resolve to the body of the result of sendRequestPromise', () => {
			return LSK.broadcastSignedTransaction(transaction).then(result =>
				result.should.be.equal(defaultRequestPromiseResult.body),
			);
		});

		it('should call the callback with the body of the result of sendRequestPromise', () => {
			return new Promise(resolve => {
				LSK.broadcastSignedTransaction({}, resolve);
			}).then(result => {
				result.should.be.equal(defaultRequestPromiseResult.body);
			});
		});
	});

	describe('#broadcastSignatures', () => {
		let signatures;
		let requestObject;

		beforeEach(() => {
			signatures = [
				{
					key1: 'value1',
					key2: 2,
				},
				{
					key3: 'value3',
					key4: 4,
				},
			];
			requestObject = {
				requestUrl: `${defaultUrl}/api/signatures`,
				nethash: defaultNethash,
				requestParams: { signatures },
			};
		});

		it('should use getFullURL to get the url', () => {
			return LSK.broadcastSignatures({}).then(() => {
				getFullURLStub.should.be.calledWithExactly(LSK);
			});
		});

		it('should call sendRequestPromise with a prepared request object', () => {
			return LSK.broadcastSignatures(signatures).then(() => {
				sendRequestPromiseStub.should.be.calledOn(LSK);
				sendRequestPromiseStub.should.be.calledWithExactly(
					POST,
					requestObject,
				);
			});
		});

		it('should resolve to the body of the result of sendRequestPromise', () => {
			return LSK.broadcastSignatures(signatures).then(result =>
				result.should.be.equal(defaultRequestPromiseResult.body),
			);
		});

		it('should call the callback with the body of the result of sendRequestPromise', () => {
			return new Promise(resolve => {
				LSK.broadcastSignatures({}, resolve);
			}).then(result => {
				result.should.be.equal(defaultRequestPromiseResult.body);
			});
		});
	});

	describe('#sendRequest', () => {
		const method = GET;
		const endpoint = 'transactions';
		let options;

		beforeEach(() => {
			options = {
				limit: 5,
				offset: 101,
			};
		});

		it('should call a callback if provided with no options', () => {
			return new Promise(resolve => {
				LSK.sendRequest(method, endpoint, resolve);
			});
		});

		it('should call a callback if provided with options', () => {
			return new Promise(resolve => {
				LSK.sendRequest(method, endpoint, options, resolve);
			});
		});

		it('should return a promise if no callback is provided with no options', () => {
			return new Promise(resolve => {
				LSK.sendRequest(method, endpoint).then(resolve);
			});
		});

		it('should return a promise if no callback is provided with options', () => {
			return new Promise(resolve => {
				LSK.sendRequest(method, endpoint, options).then(resolve);
			});
		});

		it('should check options if provided', () => {
			return LSK.sendRequest(method, endpoint, options).then(() => {
				checkOptionsStub.should.be.calledWithExactly(options);
			});
		});

		it('should call sendRequestPromise with provided options', () => {
			return LSK.sendRequest(method, endpoint, options).then(() => {
				sendRequestPromiseStub.should.be.calledOn(LSK);
				sendRequestPromiseStub.firstCall.args[2].should.be.eql(
					defaultCheckedOptions,
				);
			});
		});

		it('should call sendRequestPromise with default options', () => {
			return LSK.sendRequest(method, endpoint).then(() => {
				sendRequestPromiseStub.should.be.calledOn(LSK);
				sendRequestPromiseStub.firstCall.args[2].should.be.eql({});
			});
		});

		it('should handle timestamp is in future failures', () => {
			return LSK.sendRequest(method, endpoint, options).then(() => {
				handleTimestampIsInFutureFailuresStub.should.be.calledOn(LSK);
				handleTimestampIsInFutureFailuresStub.should.be.calledWithExactly(
					method,
					endpoint,
					defaultCheckedOptions,
					defaultRequestPromiseResult.body,
				);
			});
		});

		it('should catch promise rejections', () => {
			const error = new Error('oh no');
			handleTimestampIsInFutureFailuresStub.rejects(error);
			return LSK.sendRequest(method, endpoint, options).then(() => {
				handleSendRequestFailuresStub.should.be.calledOn(LSK);
				handleSendRequestFailuresStub.should.be.calledWithExactly(
					method,
					endpoint,
					defaultCheckedOptions,
					error,
				);
			});
		});
	});

	describe('API methods', () => {
		let callback;

		beforeEach(() => {
			callback = () => {};
			sandbox.stub(LSK, 'sendRequest');
		});

		describe('#getAccount', () => {
			it('should get account information', () => {
				const address = '12731041415715717263L';
				const options = { address };

				LSK.getAccount(address, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'accounts',
					options,
					callback,
				);
			});
		});

		describe('#getActiveDelegates', () => {
			it('should get active delegates', () => {
				const options = { limit: defaultRequestLimit };

				LSK.getActiveDelegates(defaultRequestLimit, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'delegates',
					options,
					callback,
				);
			});
		});

		describe('#getStandbyDelegates', () => {
			it('should get standby delegates', () => {
				const orderBy = 'rate:desc';
				const offset = '202';
				const options = {
					orderBy,
					offset,
					limit: defaultRequestLimit,
				};

				LSK.getStandbyDelegates(defaultRequestLimit, options, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'delegates',
					options,
					callback,
				);
			});

			it('should get standby delegates with a default offset and ordering when not specified', () => {
				LSK.getStandbyDelegates(defaultRequestLimit, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'delegates',
					{
						limit: defaultRequestLimit,
						orderBy: defaultOrderBy,
						offset: defaultRequestOffset,
					},
					callback,
				);
			});
		});

		describe('#searchDelegatesByUsername', () => {
			it('should find delegates by name', () => {
				const searchTerm = 'light';
				const options = { search: searchTerm };

				LSK.searchDelegatesByUsername(searchTerm, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'delegates',
					options,
					callback,
				);
			});
		});

		describe('#getBlocks', () => {
			it('should get a number of blocks according to requested limit', () => {
				const options = { limit: defaultRequestLimit };

				LSK.getBlocks(defaultRequestLimit, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'blocks',
					options,
					callback,
				);
			});
		});

		describe('#getForgedBlocks', () => {
			it('should get blocks for a given generator public key', () => {
				const generatorPublicKey =
					'130649e3d8d34eb59197c00bcf6f199bc4ec06ba0968f1d473b010384569e7f0';
				const options = { generatorPublicKey };

				LSK.getForgedBlocks(generatorPublicKey, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'blocks',
					options,
					callback,
				);
			});
		});

		describe('#getBlock', () => {
			it('should get a block for a given height', () => {
				const height = '2346638';
				const options = { height };

				LSK.getBlock(height, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'blocks',
					options,
					callback,
				);
			});
		});

		describe('#getTransactions', () => {
			it('should get transactions for a given address', () => {
				const recipientAddress = '12731041415715717263L';
				const senderAddress = '15731041415715717263L';
				const orderBy = 'timestamp:desc';
				const options = {
					senderId: senderAddress,
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
					orderBy,
				};
				const expectedPassedOptions = {
					recipientId: recipientAddress,
					senderId: senderAddress,
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
					orderBy,
				};

				LSK.getTransactions(recipientAddress, options, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'transactions',
					expectedPassedOptions,
					callback,
				);
			});
		});

		describe('#getTransaction', () => {
			it('should get a transaction by id', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getTransaction(transactionId, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'transactions',
					options,
					callback,
				);
			});
		});

		describe('#getVotes', () => {
			it('should get votes from a given address', () => {
				const address = '16010222169256538112L';
				const options = { address };

				LSK.getVotes(address, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'votes',
					options,
					callback,
				);
			});
		});

		describe('#getVoters', () => {
			it('should get voters for a given delegate username', () => {
				const username = 'lightcurve';
				const options = { username };

				LSK.getVoters(username, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'voters',
					options,
					callback,
				);
			});
		});

		describe('#getUnsignedMultisignatureTransactions', () => {
			it('should get all currently unsigned multisignature transactions', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getUnsignedMultisignatureTransactions(options, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'transactions/unsigned',
					options,
					callback,
				);
			});
		});

		describe('#getDapp', () => {
			it('should get a dapp by transaction id', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getDapp(transactionId, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'dapps',
					options,
					callback,
				);
			});
		});

		describe('#getDapps', () => {
			it('should get dapps with options', () => {
				const options = {
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
				};

				LSK.getDapps(options, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'dapps',
					options,
					callback,
				);
			});
		});

		describe('#getDappsByCategory', () => {
			it('should get dapps by category', () => {
				const category = 'blockchain';
				const options = {
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
				};
				const expectedPassedOptions = {
					category,
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
				};

				LSK.getDappsByCategory(category, options, callback);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'dapps',
					expectedPassedOptions,
					callback,
				);
			});
		});

		describe('#transferLSK', () => {
			it('should transfer testnet LSK', () => {
				const recipientId = '10279923186189318946L';
				const options = {
					recipientId,
					amount: defaultAmount,
					passphrase: defaultPassphrase,
					secondPassphrase: defaultSecondPassphrase,
				};

				LSK.transferLSK(
					recipientId,
					defaultAmount,
					defaultPassphrase,
					defaultSecondPassphrase,
					callback,
				);
				return LSK.sendRequest.should.be.calledWithExactly(
					POST,
					'transactions',
					options,
					callback,
				);
			});
		});
	});
});
