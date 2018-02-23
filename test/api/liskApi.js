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

describe('Lisk API module', () => {
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
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: sslPort,
	};
	const testnetHeaders = Object.assign({}, defaultHeaders, {
		nethash: testnetHash,
		version: '0.0.0a',
		port: testPort,
	});
	const customHeaders = Object.assign({}, defaultHeaders, {
		nethash: '123',
		version: '0.0.0a',
	});

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

	let LSK;

	beforeEach(() => {
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
				return LSK.should.have.property('currentNodes').be.eql(defaultNodes);
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
				return LSK.should.have.property('headers').be.eql(defaultHeaders);
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
				return LSK.currentNodes.should.be.eql(defaultTestnetNodes);
			});

			it('should return default SSL nodes if testnet is not set to true', () => {
				LSK = new LiskAPI({
					nodes: defaultSSLNodes,
					testnet: false,
					ssl: true,
				});
				return LSK.currentNodes.should.be.eql(defaultSSLNodes);
			});
		});

		describe('with SSL set to false', () => {
			it('should return default testnet nodes if testnet is set to true', () => {
				LSK = new LiskAPI({
					nodes: defaultTestnetNodes,
					testnet: true,
					ssl: false,
				});
				return LSK.currentNodes.should.be.eql(defaultTestnetNodes);
			});

			it('should return default mainnet nodes if testnet is not set to true', () => {
				LSK = new LiskAPI({
					nodes: defaultNodes,
					testnet: false,
					ssl: false,
				});
				return LSK.currentNodes.should.be.eql(defaultNodes);
			});
		});
	});

	describe('get urlProtocol', () => {
		it('should return https if ssl is true', () => {
			LSK.ssl = true;
			return LSK.urlProtocol.should.be.equal('https');
		});

		it('should return http if ssl is false', () => {
			LSK.ssl = false;
			return LSK.urlProtocol.should.be.equal('http');
		});
	});

	describe('get nodeFullURL', () => {
		it('should return with set port', () => {
			LSK = new LiskAPI({ port: '8080', node: localNode });
			return LSK.nodeFullURL.should.be.equal('https://localhost:8080');
		});

		it('should not include port in the URL if port is not set', () => {
			LSK = new LiskAPI({ port: '', node: localNode });
			return LSK.nodeFullURL.should.be.equal('https://localhost');
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
			nodesStub = sandbox.stub(LSK, 'currentNodes');
			nodesStub.get(() => [...defaultNodes]);
		});

		it('should throw an error if all relevant nodes are banned', () => {
			LSK.bannedNodes = [...defaultNodes];
			return LSK.getRandomNode
				.bind(LSK)
				.should.throw(
					'Cannot get random node: all relevant nodes have been banned.',
				);
		});

		it('should return a node', () => {
			const result = LSK.getRandomNode();
			return defaultNodes.should.containEql(result);
		});

		it('should randomly select the node', () => {
			const firstResult = LSK.getRandomNode();
			let nextResult = LSK.getRandomNode();
			// Test will almost certainly time out if not random
			while (nextResult === firstResult) {
				nextResult = LSK.getRandomNode();
			}
		});
	});

	describe('#selectNewNode', () => {
		const customNode = 'customNode';
		const getRandomNodeResult = externalNode;

		beforeEach(() => {
			sandbox.stub(LSK, 'getRandomNode').returns(getRandomNodeResult);
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

	describe('#banActiveNodeAndSelect', () => {
		let node;
		let selectNewNodeStub;

		beforeEach(() => {
			node = LSK.node;
			selectNewNodeStub = sandbox
				.stub(LSK, 'selectNewNode')
				.returns(defaultSelectedNode);
		});

		it('should call ban current node', () => {
			LSK.banActiveNodeAndSelect();
			return LSK.isBanned(node).should.be.true();
		});

		it('should call selectNewNode when the node is banned', () => {
			LSK.banActiveNodeAndSelect();
			return selectNewNodeStub.should.be.calledOnce();
		});

		it('should not call selectNewNode when the node is not banned', () => {
			const bannedNodes = [node];
			LSK.bannedNodes = bannedNodes;
			LSK.banActiveNodeAndSelect();
			return selectNewNodeStub.should.not.be.called();
		});
	});

	describe('#hasAvailableNodes', () => {
		let nodesStub;

		beforeEach(() => {
			nodesStub = sandbox.stub(LSK, 'currentNodes');
			nodesStub.get(() => [...defaultNodes]);
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

	describe('#getDefaultHeaders', () => {
		it('should provide default header values', () => {
			return LSK.getDefaultHeaders().should.eql(defaultHeaders);
		});

		it('should provide default testnet header values', () => {
			LSK.port = testPort;
			return LSK.getDefaultHeaders(testnetHash).should.eql(testnetHeaders);
		});

		it('should get values for custom headers', () => {
			return LSK.getDefaultHeaders('123').should.be.eql(customHeaders);
		});
	});

	describe('get allNodes', () => {
		let nodes;

		beforeEach(() => {
			nodes = LSK.allNodes;
		});

		it('should show the current node', () => {
			return nodes.should.have.property('current').equal(LSK.node);
		});

		it('should list 2 default nodes', () => {
			return nodes.should.have.property('default').and.eql([...defaultNodes]);
		});

		it('should list 2 testnet node', () => {
			return nodes.should.have
				.property('testnet')
				.and.eql([...defaultTestnetNodes]);
		});
	});

	describe('#setTestnet', () => {
		let selectNewNodeStub;
		beforeEach(() => {
			selectNewNodeStub = sandbox
				.stub(LSK, 'selectNewNode')
				.returns(defaultSelectedNode);
		});

		describe('when testnet is initially true', () => {
			beforeEach(() => {
				LSK.testnet = true;
			});
			describe('to true', () => {
				it('should not call selectNewNode', () => {
					LSK.setTestnet(true);
					selectNewNodeStub.should.not.be.called();
				});

				it('should have testnet set to true', () => {
					LSK.setTestnet(true);
					return LSK.should.have.property('testnet').and.be.true();
				});

				it('should not change bannedNodes', () => {
					LSK.bannedNodes = [...defaultBannedNodes];
					LSK.setTestnet(true);
					return LSK.should.have
						.property('bannedNodes')
						.and.eql(defaultBannedNodes);
				});
			});

			describe('to false', () => {
				it('should set testnet to false', () => {
					LSK.setTestnet(false);
					return LSK.should.have.property('testnet').and.be.false();
				});

				it('should reset banned nodes', () => {
					LSK.bannedNodes = [...defaultNodes];
					LSK.setTestnet(false);
					return LSK.bannedNodes.should.eql([]);
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
		});

		describe('when testnet is initially false', () => {
			beforeEach(() => {
				LSK.testnet = false;
			});
			describe('to true', () => {
				it('should set testnet to true', () => {
					LSK.setTestnet(true);
					return LSK.should.have.property('testnet').and.be.true();
				});

				it('should reset banned nodes', () => {
					LSK.bannedNodes = [...defaultNodes];
					LSK.setTestnet(true);
					return LSK.bannedNodes.should.eql([]);
				});

				it('should set port to 7000 when ssl is true', () => {
					LSK.ssl = true;
					LSK.setTestnet(true);
					return LSK.should.have.property('port').and.be.equal(testPort);
				});

				it('should set port to 7000 when ssl is false', () => {
					LSK.ssl = false;
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
				it('should not call selectNewNode', () => {
					LSK.setTestnet(false);
					selectNewNodeStub.should.not.be.called();
				});

				it('should not call selectNewNode', () => {
					LSK.setTestnet(false);
					selectNewNodeStub.should.not.be.called();
				});

				it('should have testnet set to true', () => {
					LSK.setTestnet(false);
					return LSK.should.have.property('testnet').and.be.false();
				});

				it('should not change bannedNodes', () => {
					LSK.bannedNodes = [...defaultBannedNodes];
					LSK.setTestnet(false);
					return LSK.should.have
						.property('bannedNodes')
						.and.eql(defaultBannedNodes);
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
				LSK.ssl = true;
			});

			describe('when set to true', () => {
				it('should have ssl set to true', () => {
					LSK.setSSL(true);
					return LSK.should.have.property('ssl').and.be.true();
				});

				it('should not change bannedNodes', () => {
					LSK.bannedNodes = [...defaultBannedNodes];
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
					LSK.ssl = true;
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
					defaultBannedNodes.forEach(() => LSK.banActiveNodeAndSelect());
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
				LSK.ssl = false;
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

				it('should set port to ssl port even though testnet is true', () => {
					LSK.testnet = true;
					LSK.setSSL(true);
					return LSK.should.have.property('port').and.be.equal(sslPort);
				});

				it('should reset bannedNodes', () => {
					defaultBannedNodes.forEach(() => LSK.banActiveNodeAndSelect());
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
					LSK.bannedNodes = [...defaultBannedNodes];
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
});
