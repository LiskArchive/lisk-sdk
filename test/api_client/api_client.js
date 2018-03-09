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
import APIClient, {
	getMainnetClient,
	getTestnetClient,
} from 'api_client/api_client';

describe('APIClient module', () => {
	const mainnetHash =
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
	const mainnetNodes = [
		'node01.lisk.io',
		'node02.lisk.io',
		'node03.lisk.io',
		'node04.lisk.io',
		'node05.lisk.io',
		'node06.lisk.io',
		'node07.lisk.io',
		'node08.lisk.io',
	];
	const testnetHash =
		'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const testnetNodes = ['testnet.lisk.io'];
	const defaultHeaders = {
		'Content-Type': 'application/json',
		nethash: mainnetHash,
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=1.0.0',
	};

	const customHeaders = {
		'Content-Type': 'application/json',
		nethash: testnetHash,
		os: 'lisk-js-api',
		version: '0.5.0',
		minVersion: '>=0.1.0',
	};

	const localNode = 'http://localhost:7000';
	const externalNode = 'https://googIe.com:8080';
	const sslNode = 'https://external.lisk.io:443';
	const externalTestnetNode = 'http://testnet.lisk.io';
	const defaultNodes = [localNode, externalNode, sslNode];
	const defaultSelectedNode = 'selected_node';

	let apiClient;

	beforeEach(() => {
		apiClient = new APIClient(defaultNodes, mainnetHash);
	});

	describe('#constructor', () => {
		it('should throw an error if no arguments are passed to constructor', () => {
			return (() => new APIClient()).should.throw(
				Error,
				'Require nodes to be initialized.',
			);
		});

		it('should throw an error if first argument passed to constructor is not array', () => {
			return (() => new APIClient('non-array')).should.throw(
				Error,
				'Require nodes to be initialized.',
			);
		});

		it('should throw an error if first argument passed to constructor is empty array', () => {
			return (() => new APIClient([])).should.throw(
				Error,
				'Require nodes to be initialized.',
			);
		});

		it('should throw an error if no second argument is passed to constructor', () => {
			return (() => new APIClient(defaultNodes)).should.throw(
				Error,
				'Require nethash to be initialized.',
			);
		});

		it('should throw an error if second argument is passed to constructor is not string', () => {
			return (() => new APIClient(defaultNodes, 123)).should.throw(
				Error,
				'Require nethash to be initialized.',
			);
		});

		it('should throw an error if second argument is passed to constructor is empty string', () => {
			return (() => new APIClient(defaultNodes, '')).should.throw(
				Error,
				'Require nethash to be initialized.',
			);
		});

		it('should throw an error if second argument is passed to constructor is empty string', () => {
			return (() => new APIClient(defaultNodes, '')).should.throw(
				Error,
				'Require nethash to be initialized.',
			);
		});

		it('should create a new instance of APIClient', () => {
			return apiClient.should.be.an('object').and.be.instanceof(APIClient);
		});

		describe('headers', () => {
			it('should set with passed nethash, with default options', () => {
				return apiClient.should.have
					.property('headers')
					.and.eql(defaultHeaders);
			});

			it('should set custom headers with supplied options', () => {
				apiClient = new APIClient(defaultNodes, testnetHash, {
					version: '0.5.0',
					minVersion: '>=0.1.0',
				});
				return apiClient.should.have.property('headers').and.eql(customHeaders);
			});
		});

		describe('nodes', () => {
			it('should set with random node with initialized setup if no node is specified by options', () => {
				return apiClient.should.have.property('nodes').and.equal(defaultNodes);
			});
		});

		describe('bannedNodes', () => {
			it('should set empty array if no option is passed', () => {
				return apiClient.should.have.property('bannedNodes').be.eql([]);
			});

			it('should set bannedNodes when passed as an option', () => {
				const bannedNodes = ['a', 'b'];
				apiClient = new APIClient(defaultNodes, mainnetHash, { bannedNodes });
				return apiClient.should.have
					.property('bannedNodes')
					.be.eql(bannedNodes);
			});
		});

		describe('currentNode', () => {
			it('should set with random node with initialized setup if no node is specified by options', () => {
				return apiClient.should.have.property('currentNode').and.not.empty;
			});

			it('should set with supplied node if node is specified by options', () => {
				apiClient = new APIClient(defaultNodes, mainnetHash, {
					node: externalTestnetNode,
				});
				return apiClient.should.have
					.property('currentNode')
					.and.equal(externalTestnetNode);
			});
		});

		describe('randomizeNodes', () => {
			it('should set randomizeNodes to true when randomizeNodes not explicitly set', () => {
				apiClient = new APIClient(defaultNodes, mainnetHash, {
					randomizeNodes: undefined,
				});
				return apiClient.should.have.property('randomizeNodes').be.true;
			});

			it('should set randomizeNodes to true on initialization when passed as an option', () => {
				apiClient = new APIClient(defaultNodes, mainnetHash, {
					randomizeNodes: true,
				});
				return apiClient.should.have.property('randomizeNodes').be.true;
			});

			it('should set randomizeNodes to false on initialization when passed as an option', () => {
				apiClient = new APIClient(defaultNodes, mainnetHash, {
					randomizeNodes: false,
				});
				return apiClient.should.have.property('randomizeNodes').be.false;
			});
		});
	});

	describe('#getNewNode', () => {
		it('should throw an error if all relevant nodes are banned', () => {
			apiClient.bannedNodes = [...defaultNodes];
			return apiClient.getNewNode
				.bind(apiClient)
				.should.throw(
					'Cannot get random node: all relevant nodes have been banned.',
				);
		});

		it('should return a node', () => {
			const result = apiClient.getNewNode();
			return defaultNodes.should.contain(result);
		});

		it('should randomly select the node', () => {
			const firstResult = apiClient.getNewNode();
			let nextResult = apiClient.getNewNode();
			// Test will almost certainly time out if not random
			while (nextResult === firstResult) {
				nextResult = apiClient.getNewNode();
			}
		});
	});

	describe('#banActiveNode', () => {
		let node;

		beforeEach(() => {
			node = apiClient.node;
		});

		it('should add current node to banned nodes', () => {
			apiClient.banActiveNode();
			return apiClient.isBanned(node).should.be.true;
		});

		it('should not duplicate a banned node', () => {
			const bannedNodes = [node];
			apiClient.bannedNodes = bannedNodes;
			apiClient.banActiveNode();

			return apiClient.bannedNodes.should.be.eql(bannedNodes);
		});
	});

	describe('#banActiveNodeAndSelect', () => {
		let node;
		let getNewNodeStub;

		beforeEach(() => {
			node = apiClient.node;
			getNewNodeStub = sandbox
				.stub(apiClient, 'getNewNode')
				.returns(defaultSelectedNode);
		});

		it('should call ban current node', () => {
			apiClient.banActiveNodeAndSelect();
			return apiClient.isBanned(node).should.be.true;
		});

		it('should call selectNewNode when the node is banned', () => {
			apiClient.banActiveNodeAndSelect();
			return getNewNodeStub.should.be.calledOnce;
		});

		it('should not call selectNewNode when the node is not banned', () => {
			const bannedNodes = [node];
			apiClient.bannedNodes = bannedNodes;
			apiClient.banActiveNodeAndSelect();
			return getNewNodeStub.should.not.be.called;
		});
	});

	describe('#isBanned', () => {
		it('should return true when provided node is banned', () => {
			apiClient.bannedNodes.push(localNode);
			return apiClient.isBanned(localNode).should.be.true;
		});

		it('should return false when provided node is not banned', () => {
			return apiClient.isBanned(localNode).should.be.false;
		});
	});

	describe('#hasAvailableNodes', () => {
		it('should return false without nodes left', () => {
			apiClient.bannedNodes = [...defaultNodes];
			const result = apiClient.hasAvailableNodes();
			return result.should.be.false;
		});

		it('should return true if nodes are available', () => {
			const result = apiClient.hasAvailableNodes();
			return result.should.be.true;
		});
	});

	describe('#getMainnetClient', () => {
		let client;
		beforeEach(() => {
			client = getMainnetClient();
		});

		it('should return APIClient instance', () => {
			return client.should.be.instanceof(APIClient);
		});

		it('should contain mainnet nodes', () => {
			return client.nodes.should.eql(mainnetNodes);
		});

		it('should be set to mainnet hash', () => {
			return client.headers.nethash.should.equal(mainnetHash);
		});
	});

	describe('#getTestnetClient', () => {
		let client;
		beforeEach(() => {
			client = getTestnetClient();
		});

		it('should return APIClient instance', () => {
			return client.should.be.instanceof(APIClient);
		});

		it('should contain testnet nodes', () => {
			return client.nodes.should.eql(testnetNodes);
		});

		it('should be set to testnet hash', () => {
			return client.headers.nethash.should.equal(testnetHash);
		});
	});
});
