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

const httpClient = require('api/httpClient');
const utils = require('api/utils');

describe('Lisk API module', () => {
	const fixedPoint = 10 ** 8;
	const testPort = '7000';
	const livePort = '8000';
	const sslPort = '443';
	const mainnetHash =
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
	const testnetHash =
		'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const defaultHeaders = {
		'Content-Type': 'application/json',
		nethash: mainnetHash,
		broadhash: mainnetHash,
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: sslPort,
	};
	const testnetHeaders = Object.assign({}, defaultHeaders, {
		nethash: testnetHash,
		broadhash: testnetHash,
		port: testPort,
	});
	const customHeaders = Object.assign({}, defaultHeaders, {
		nethash: '123',
		version: '0.0.0a',
	});
	const defaultPassphrase = 'secret';
	const defaultSecondPassphrase = 'second secret';
	const defaultEndpoint = 'defaultendpoint';
	const fullURL = 'http://localhost:8080';
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

	let getStub;
	let postStub;
	let getHeadersStub;
	let LSK;

	beforeEach(() => {
		getStub = sandbox
			.stub(httpClient, 'get')
			.resolves(Object.assign({}, defaultRequestPromiseResult));
		postStub = sandbox
			.stub(httpClient, 'post')
			.resolves(Object.assign({}, defaultRequestPromiseResult));
		getHeadersStub = sandbox
			.stub(utils, 'getDefaultHeaders')
			.returns(defaultHeaders);
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
				LSK = new LiskAPI({ ssl: undefined });
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
				LSK = new LiskAPI({ randomizeNodes: undefined });
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

		describe('bannedNodes', () => {
			it('should set empty array if no option is passed', () => {
				LSK = new LiskAPI({ bannedNodes: undefined });
				return LSK.should.have.property('bannedNodes').be.eql([]);
			});

			it('should set bannedNodes when passed as an option', () => {
				const bannedNodes = ['a', 'b'];
				LSK = new LiskAPI({ bannedNodes });
				return LSK.should.have.property('bannedNodes').be.eql(bannedNodes);
			});
		});

		describe('headers', () => {
			it('should set with passed nethash', () => {
				LSK = new LiskAPI({ headers: customHeaders });
				return LSK.should.have.property('headers').be.eql(customHeaders);
			});

			it('should set default mainnet nethash', () => {
				LSK = new LiskAPI();
				return LSK.should.have.property('headers').be.equal(defaultHeaders);
			});
		});
	});

	describe('get nodes', () => {
		describe('with SSL set to true', () => {
			it('should return default testnet nodes if testnet is set to true', () => {
				LSK = new LiskAPI({
					nodes: defaultTestnetNodes,
					testnet: true,
					ssl: true,
				});
				return LSK.nodes.should.be.eql(defaultTestnetNodes);
			});

			it('should return default SSL nodes if testnet is not set to true', () => {
				LSK = new LiskAPI({
					nodes: defaultSSLNodes,
					testnet: false,
					ssl: true,
				});
				LSK.testnet = false;
				return LSK.nodes.should.be.eql(defaultSSLNodes);
			});
		});

		describe('with SSL set to false', () => {
			it('should return default testnet nodes if testnet is set to true', () => {
				LSK = new LiskAPI({
					nodes: defaultTestnetNodes,
					testnet: true,
					ssl: false,
				});
				return LSK.nodes.should.be.eql(defaultTestnetNodes);
			});

			it('should return default mainnet nodes if testnet is not set to true', () => {
				LSK = new LiskAPI({ nodes: defaultNodes, testnet: false, ssl: false });
				return LSK.nodes.should.be.eql(defaultNodes);
			});
		});
	});

	describe('get urlPrefix', () => {
		it('should return https if ssl is true', () => {
			LSK.ssl = true;
			return LSK.urlPrefix.should.be.equal('https');
		});

		it('should return https if ssl is false', () => {
			LSK.ssl = false;
			return LSK.urlPrefix.should.be.equal('http');
		});
	});

	describe('get fullURL', () => {
		it('should return with set port', () => {
			LSK = new LiskAPI({ port: '8080', node: localNode });
			return LSK.fullURL.should.be.equal('https://localhost:8080');
		});

		it('should return default port if it is not set', () => {
			LSK = new LiskAPI({ port: '', node: localNode });
			return LSK.fullURL.should.be.equal('https://localhost');
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
				LSK.bannedNodes = [];
			});
			describe('if randomizeNodes is set to false', () => {
				beforeEach(() => {
					LSK.randomizeNodes = false;
				});

				it('should throw an error if the provided node is banned', () => {
					LSK.bannedNodes = [customNode];
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

			it('should return true with contents', () => {
				nodesStub.get(() => ['nodeA']);
				const result = LSK.hasAvailableNodes();
				return result.should.be.true();
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

	describe('#getHeaders', () => {
		it('should provide default mainnet nethash values with ssl', () => {
			getHeadersStub.returns(defaultHeaders);
			getHeadersStub.calledWithExactly(LSK.node, LSK.testnet);
			return LSK.getHeaders().should.eql(defaultHeaders);
		});

		it('should provide default testnet nethash values', () => {
			getHeadersStub.returns(testnetHeaders);
			getHeadersStub.calledWithExactly(LSK.node, LSK.testnet);
			return LSK.getHeaders().should.eql(testnetHeaders);
		});

		it('should get values for a custom nethash', () => {
			getHeadersStub.returns(defaultHeaders);
			getHeadersStub.calledWithExactly(LSK.node, LSK.testnet);
			return LSK.getHeaders('123').should.be.eql(customHeaders);
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

	describe('#setTestnet', () => {
		let selectNewNodeStub;
		beforeEach(() => {
			selectNewNodeStub = sandbox
				.stub(LSK, 'selectNewNode')
				.returns(defaultSelectedNode);
		});

		describe('to true', () => {
			beforeEach(() => {
				LSK.setTestnet(false);
			});

			it('should set testnet to true', () => {
				LSK.setTestnet(true);
				return LSK.should.have.property('testnet').and.be.true();
			});

			it('should set port to 7000', () => {
				LSK.setTestnet(true);
				return LSK.should.have.property('port').and.be.equal(testPort);
			});

			it('should select a node', () => {
				const callCount = selectNewNodeStub.callCount;
				LSK.setTestnet(true);
				return selectNewNodeStub.should.have.callCount(callCount + 1);
			});
		});

		describe('to false', () => {
			beforeEach(() => {
				LSK.setTestnet(true);
			});

			it('should set testnet to false', () => {
				LSK.setTestnet(false);
				return LSK.should.have.property('testnet').and.be.false();
			});

			it('should set port to 443', () => {
				LSK.ssl = true;
				LSK.setTestnet(false);
				return LSK.should.have.property('port').and.be.equal(sslPort);
			});

			it('should set port to live port', () => {
				LSK.ssl = false;
				LSK.setTestnet(false);
				return LSK.should.have.property('port').and.be.equal(livePort);
			});

			it('should select a node', () => {
				const callCount = selectNewNodeStub.callCount;
				LSK.setTestnet(false);
				return selectNewNodeStub.should.have.callCount(callCount + 1);
			});
		});

		describe('banned nodes', () => {
			beforeEach(() => {
				defaultBannedNodes.forEach(() => LSK.banActiveNode());
			});

			describe('when initially on mainnet', () => {
				it('should reset banned nodes when switching from mainnet to testnet', () => {
					LSK.setTestnet(true);
					return defaultNodes.every(node =>
						LSK.isBanned(node).should.be.false(),
					);
				});

				it('should not reset banned nodes when switching from mainnet to mainnet', () => {
					const bannedNodes = defaultNodes.filter(node => LSK.isBanned(node));
					LSK.setTestnet(false);
					return bannedNodes.every(node => LSK.isBanned(node).should.be.true());
				});
			});

			describe('when initially on testnet', () => {
				beforeEach(() => {
					LSK.setTestnet(true);
					defaultBannedNodes.forEach(() => LSK.banActiveNode());
				});

				it('should reset banned nodes when switching from testnet to mainnet', () => {
					LSK.testnet = false;
					return defaultNodes.every(node =>
						LSK.isBanned(node).should.be.false(),
					);
				});

				it('should not reset banned nodes when switching from testnet to testnet', () => {
					const bannedNodes = defaultNodes.filter(node => LSK.isBanned(node));
					LSK.testnet = true;
					return bannedNodes.every(node => LSK.isBanned(node).should.be.true());
				});
			});
		});
	});

	describe('#setSSL', () => {
		let selectNewNodeStub;
		beforeEach(() => {
			selectNewNodeStub = sandbox
				.stub(LSK, 'selectNewNode')
				.returns(defaultSelectedNode);
		});

		describe('when ssl is initially true', () => {
			beforeEach(() => {
				LSK.setSSL(true);
			});

			describe('when set to true', () => {
				it('should have ssl set to true', () => {
					LSK.setSSL(true);
					return LSK.should.have.property('ssl').and.be.true();
				});

				it('should not change bannedNodes', () => {
					LSK.bannedNodes = [].concat(defaultBannedNodes);
					LSK.setSSL(true);
					return LSK.should.have
						.property('bannedNodes')
						.and.eql(defaultBannedNodes);
				});

				it('should not select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.setSSL(true);
					return selectNewNodeStub.should.have.callCount(callCount);
				});
			});

			describe('when set to false', () => {
				beforeEach(() => {
					LSK.setSSL(true);
				});
				it('should set port to ssl port', () => {
					LSK.setSSL(false);
					return LSK.should.have.property('port').and.be.equal(livePort);
				});
				it('should set port to test port', () => {
					LSK.testnet = true;
					LSK.setSSL(false);
					return LSK.should.have.property('port').and.be.equal(testPort);
				});
				it('should have ssl set to false', () => {
					LSK.setSSL(false);
					return LSK.should.have.property('ssl').and.be.false();
				});

				it('should reset bannedNodes', () => {
					defaultBannedNodes.forEach(() => LSK.banActiveNode());
					LSK.setSSL(false);
					return defaultNodes.every(node =>
						LSK.isBanned(node).should.be.false(),
					);
				});

				it('should select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.setSSL(false);
					return selectNewNodeStub.should.have.callCount(callCount + 1);
				});
			});
		});

		describe('when ssl is initially false', () => {
			beforeEach(() => {
				LSK.setSSL(false);
			});

			describe('when set to true', () => {
				it('should have ssl set to true', () => {
					LSK.setSSL(true);
					return LSK.should.have.property('ssl').and.be.true();
				});

				it('should set port to ssl port', () => {
					LSK.setSSL(true);
					return LSK.should.have.property('port').and.be.equal(sslPort);
				});

				it('should set port to test port', () => {
					LSK.testnet = true;
					LSK.setSSL(true);
					return LSK.should.have.property('port').and.be.equal(sslPort);
				});

				it('should reset bannedNodes', () => {
					defaultBannedNodes.forEach(() => LSK.banActiveNode());
					LSK.setSSL(true);
					return defaultNodes.every(node =>
						LSK.isBanned(node).should.be.false(),
					);
				});

				it('should select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.setSSL(true);
					return selectNewNodeStub.should.have.callCount(callCount + 1);
				});
			});

			describe('when set to false', () => {
				it('should have ssl set to false', () => {
					LSK.setSSL(false);
					return LSK.should.have.property('ssl').and.be.false();
				});

				it('should not change bannedNodes', () => {
					LSK.bannedNodes = [].concat(defaultBannedNodes);
					LSK.setSSL(false);
					return LSK.should.have
						.property('bannedNodes')
						.and.eql(defaultBannedNodes);
				});

				it('should select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.setSSL(false);
					return selectNewNodeStub.should.have.callCount(callCount);
				});
			});
		});
	});

	describe('#broadcastSignedTransaction', () => {
		let transaction;

		beforeEach(() => {
			transaction = {
				key1: 'value1',
				key2: 2,
			};
			LSK.headers = defaultHeaders;
			sandbox.stub(LSK, 'fullURL').get(() => fullURL);
		});

		it('should call post with a prepared request object', () => {
			return LSK.broadcastSignedTransaction(transaction).then(() => {
				postStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'transactions',
					{ transaction },
				);
			});
		});

		it('should resolve to the body of the result of sendRequestPromise', () => {
			return LSK.broadcastSignedTransaction(transaction).then(result =>
				result.should.be.equal(defaultRequestPromiseResult.body),
			);
		});
	});

	describe('#broadcastSignatures', () => {
		let signatures;

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
			sandbox.stub(LSK, 'fullURL').get(() => fullURL);
			LSK.headers = defaultHeaders;
		});

		it('should call sendRequestPromise with a prepared request object', () => {
			return LSK.broadcastSignatures(signatures).then(() => {
				postStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'signatures',
					{ signatures },
				);
			});
		});

		it('should resolve to the body of the result of sendRequestPromise', () => {
			return LSK.broadcastSignatures(signatures).then(result =>
				result.should.be.equal(defaultRequestPromiseResult.body),
			);
		});
	});

	describe('#transferLSK', () => {
		let handlePostStub;
		beforeEach(() => {
			handlePostStub = sandbox.stub(LSK, 'handlePost');
		});

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
			);
			handlePostStub.should.calledWithExactly('transactions', options);
		});
	});

	describe('#handlePost', () => {
		let options;
		let handleTimestampIsInFutureFailuresStub;
		let handlePostFailuresStub;

		beforeEach(() => {
			options = {
				limit: 5,
				offset: 101,
			};
			handleTimestampIsInFutureFailuresStub = sandbox.stub(
				LSK,
				'handleTimestampIsInFutureFailures',
			);
			handlePostFailuresStub = sandbox.stub(LSK, 'handlePostFailures');
		});

		it('should call post with provided options', () => {
			LSK.handlePost(defaultEndpoint, options).then(() => {
				postStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					defaultEndpoint,
					options,
				);
			});
		});

		it('should call handleTimestampIsInFutureFailures with provided options', () => {
			LSK.handlePost(defaultEndpoint, options).then(() => {
				handleTimestampIsInFutureFailuresStub.should.calledWithExactly(
					defaultRequestPromiseResult.body,
					defaultEndpoint,
					options,
				);
			});
		});

		it('should call handle post failures with provided options if error', () => {
			const error = new Error('oh no');
			postStub.rejects(error);
			LSK.handlePost(defaultEndpoint, options).then(() => {
				handlePostFailuresStub.should.be.calledWithExactly(
					error,
					defaultEndpoint,
					options,
				);
			});
		});
	});

	describe('#handlePostFailures', () => {
		let options;
		let error;
		let handlePostSpy;
		let selectNewNodeSpy;
		let banActiveNodeSpy;
		let clock;

		beforeEach(() => {
			options = {
				key1: 'value 1',
				key2: 2,
			};
			error = new Error('Test error.');
		});

		describe('if a redial is possible', () => {
			beforeEach(() => {
				LSK = new LiskAPI({ nodes: defaultNodes });
				sandbox.stub(LSK, 'hasAvailableNodes').returns(true);
				banActiveNodeSpy = sandbox.spy(LSK, 'banActiveNode');
				handlePostSpy = sandbox.spy(LSK, 'handlePost');
				selectNewNodeSpy = sandbox.spy(LSK, 'selectNewNode');
				clock = sinon.useFakeTimers();
			});

			afterEach(() => {
				clock.restore();
			});

			it('should ban the node with options randomizeNodes true', () => {
				LSK.randomizeNodes = true;
				const req = LSK.handlePostFailures(error, defaultEndpoint, options);
				clock.tick(1000);
				req.then(() => {
					banActiveNodeSpy.should.be.calledOnce();
				});
			});

			it('should not ban the node with options randomizeNodes false', () => {
				LSK.randomizeNodes = false;
				const req = LSK.handlePostFailures(error, defaultEndpoint, options);
				clock.tick(1000);
				req.then(() => {
					banActiveNodeSpy.should.not.be.called();
				});
			});

			it('should set a new node', () => {
				const req = LSK.handlePostFailures(error, defaultEndpoint, options);
				clock.tick(1000);
				req.then(() => {
					selectNewNodeSpy.should.be.calledOnce();
				});
			});

			it('should send the request again with the same arguments', () => {
				const req = LSK.handlePostFailures(error, defaultEndpoint, options);
				clock.tick(1000);
				req.then(() => {
					handlePostSpy.should.be.calledWithExactly(defaultEndpoint, options);
				});
			});
		});

		describe('if no redial is possible', () => {
			beforeEach(() => {
				sandbox.stub(LSK, 'hasAvailableNodes').returns(false);
			});

			it('should resolve to an object with success set to false', () => {
				return LSK.handlePostFailures(
					error,
					defaultEndpoint,
					options,
				).then(result => {
					result.should.have.property('success').and.be.equal(false);
				});
			});

			it('should resolve to an object with the provided error if no redial is possible', () => {
				return LSK.handlePostFailures(
					error,
					defaultEndpoint,
					options,
				).then(result => {
					result.should.have.property('error').and.be.equal(error);
				});
			});

			it('should resolve to an object with a helpful message', () => {
				return LSK.handlePostFailures(
					error,
					defaultEndpoint,
					options,
				).then(result => {
					result.should.have
						.property('message')
						.and.be.equal(
							'Could not create an HTTP request to any known nodes.',
						);
				});
			});
		});
	});

	describe('#handleTimestampIsInFutureFailures', () => {
		let result;
		let options;
		let postResult;
		let handlePostStub;

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
			postResult = { success: true, sendRequest: true };
			handlePostStub = sandbox.stub(LSK, 'handlePost').resolves(postResult);
		});

		it('should resolve the result if success is true', () => {
			result.success = true;
			return LSK.handleTimestampIsInFutureFailures(
				result,
				defaultEndpoint,
				options,
			).then(returnValue => {
				returnValue.should.equal(result);
			});
		});

		it('should resolve the result if there is no message', () => {
			delete result.message;
			return LSK.handleTimestampIsInFutureFailures(
				result,
				defaultEndpoint,
				options,
			).then(returnValue => {
				returnValue.should.equal(result);
			});
		});

		it('should resolve the result if the message is not about the timestamp being in the future', () => {
			result.message = 'Timestamp is in the past';
			return LSK.handleTimestampIsInFutureFailures(
				result,
				defaultEndpoint,
				options,
			).then(returnValue => {
				returnValue.should.equal(result);
			});
		});

		it('should resolve the result if the time offset is greater than 40 seconds', () => {
			options.timeOffset = 41;
			return LSK.handleTimestampIsInFutureFailures(
				result,
				defaultEndpoint,
				options,
			).then(returnValue => {
				returnValue.should.equal(result);
			});
		});

		it('should resend the request with a time offset of 10 seconds if all those conditions are met and the time offset is not specified', () => {
			delete options.timeOffset;
			const expectedOptions = Object.assign({}, options, {
				timeOffset: 10,
			});
			return LSK.handleTimestampIsInFutureFailures(
				result,
				defaultEndpoint,
				options,
			).then(returnValue => {
				returnValue.should.be.eql(postResult);
				handlePostStub.should.be.calledWithExactly(
					defaultEndpoint,
					expectedOptions,
				);
			});
		});

		it('should resend the request with the time offset increased by 10 seconds if all those conditions are met and the time offset is specified', () => {
			const expectedOptions = Object.assign({}, options, {
				timeOffset: 50,
			});
			return LSK.handleTimestampIsInFutureFailures(
				result,
				defaultEndpoint,
				options,
			).then(returnValue => {
				returnValue.should.be.eql(postResult);
				handlePostStub.should.be.calledWithExactly(
					defaultEndpoint,
					expectedOptions,
				);
			});
		});
	});

	describe('API methods', () => {
		beforeEach(() => {
			sandbox.stub(LSK, 'fullURL').get(() => fullURL);
		});
		describe('#getAccount', () => {
			it('should get account information', () => {
				const address = '12731041415715717263L';
				LSK.getAccount(address);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'accounts',
					{ address },
				);
			});
		});

		describe('#getActiveDelegates', () => {
			it('should get active delegates', () => {
				const options = { limit: defaultRequestLimit };
				LSK.getActiveDelegates(defaultRequestLimit);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'delegates',
					options,
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
				LSK.getStandbyDelegates(defaultRequestLimit, options);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'delegates',
					options,
				);
			});

			it('should get standby delegates with a default offset and ordering when not specified', () => {
				LSK.getStandbyDelegates(defaultRequestLimit);
				const options = {
					limit: defaultRequestLimit,
					orderBy: defaultOrderBy,
					offset: defaultRequestOffset,
				};
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'delegates',
					options,
				);
			});
		});

		describe('#getBlock', () => {
			it('should get a block for a given height', () => {
				const height = '2346638';
				const options = { height };

				LSK.getBlock(height);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'blocks',
					options,
				);
			});
		});

		describe('#getBlocks', () => {
			it('should get a number of blocks according to requested limit', () => {
				const options = { limit: defaultRequestLimit };

				LSK.getBlocks(defaultRequestLimit);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'blocks',
					options,
				);
			});
		});

		describe('#getForgedBlocks', () => {
			it('should get blocks for a given generator public key', () => {
				const generatorPublicKey =
					'130649e3d8d34eb59197c00bcf6f199bc4ec06ba0968f1d473b010384569e7f0';
				const options = { generatorPublicKey };

				LSK.getForgedBlocks(generatorPublicKey);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'blocks',
					options,
				);
			});
		});

		describe('#getDapp', () => {
			it('should get a dapp by transaction id', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getDapp(transactionId);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'dapps',
					options,
				);
			});
		});

		describe('#getDapps', () => {
			it('should get dapps with options', () => {
				const options = {
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
				};

				LSK.getDapps(options);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'dapps',
					options,
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
				LSK.getDappsByCategory(category, options);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'dapps',
					expectedPassedOptions,
				);
			});
		});

		describe('#getTransaction', () => {
			it('should get a transaction by id', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getTransaction(transactionId);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'transactions',
					options,
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

				LSK.getTransactions(recipientAddress, options);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'transactions',
					expectedPassedOptions,
				);
			});
		});

		describe('#getUnsignedMultisignatureTransactions', () => {
			it('should get all currently unsigned multisignature transactions', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getUnsignedMultisignatureTransactions(options);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'transactions/unsigned',
					options,
				);
			});
		});

		describe('#getVoters', () => {
			it('should get voters for a given delegate username', () => {
				const username = 'lightcurve';
				const options = { username };

				LSK.getVoters(username);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'voters',
					options,
				);
			});
		});
		describe('#getVotes', () => {
			it('should get votes from a given address', () => {
				const address = '16010222169256538112L';
				const options = { address };

				LSK.getVotes(address);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'votes',
					options,
				);
			});
		});

		describe('#searchDelegatesByUsername', () => {
			it('should find delegates by name', () => {
				const searchTerm = 'light';
				const options = { search: searchTerm };

				LSK.searchDelegatesByUsername(searchTerm);
				return getStub.should.be.calledWithExactly(
					fullURL,
					defaultHeaders,
					'delegates',
					options,
				);
			});
		});
	});
});
