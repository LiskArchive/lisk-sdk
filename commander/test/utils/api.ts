/*
 * LiskHQ/lisk-commander
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
 *
 */
import { expect } from 'chai';
import { getAPIClient } from '../../src/utils/api';
import { APIClient } from '@liskhq/lisk-api-client';

describe('api utils', () => {
	const mainnetNethash =
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
	const testnetNethash =
		'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const mainnetNodes = [
		'https://node01.lisk.io:443',
		'https://node02.lisk.io:443',
		'https://node03.lisk.io:443',
		'https://node04.lisk.io:443',
		'https://node05.lisk.io:443',
		'https://node06.lisk.io:443',
		'https://node07.lisk.io:443',
		'https://node08.lisk.io:443',
	];
	const testnetNode = 'https://testnet.lisk.io:443';

	interface APIConfig {
		readonly network: string;
		readonly nodes: ReadonlyArray<string>;
	}

	let apiClient: APIClient;
	let apiConfig: APIConfig;

	describe('when the network is set to main and nodes are provided', () => {
		beforeEach(() => {
			apiConfig = {
				network: 'main',
				nodes: ['http://localhost:4000'],
			};
			apiClient = getAPIClient(apiConfig);
			return Promise.resolve();
		});

		it('should have mainnet nethash', () => {
			return expect(apiClient.headers.nethash).to.be.equal(mainnetNethash);
		});

		it('should have currentNode as first element of the api.nodes', () => {
			return expect(apiClient.currentNode).to.be.equal(apiConfig.nodes[0]);
		});
	});

	describe('when the network is set to main and nodes are empty', () => {
		beforeEach(() => {
			apiConfig = {
				network: 'main',
				nodes: [],
			};
			apiClient = getAPIClient(apiConfig);
			return Promise.resolve();
		});

		it('should have mainnet nethash', () => {
			return expect(apiClient.headers.nethash).to.be.equal(mainnetNethash);
		});

		it('should have currentNode as the mainnet node', () => {
			return expect(mainnetNodes).to.include(apiClient.currentNode);
		});
	});

	describe('when the network is set to test and nodes are provided', () => {
		beforeEach(() => {
			apiConfig = {
				network: 'test',
				nodes: ['http://localhost:4000'],
			};
			apiClient = getAPIClient(apiConfig);
			return Promise.resolve();
		});

		it('should have testnet nethash', () => {
			return expect(apiClient.headers.nethash).to.be.equal(testnetNethash);
		});

		it('should have currentNode as first element of the api.nodes', () => {
			return expect(apiClient.currentNode).to.be.equal(apiConfig.nodes[0]);
		});
	});

	describe('when the network is set to test and the nodes are empty', () => {
		beforeEach(() => {
			apiConfig = {
				network: 'test',
				nodes: [],
			};
			apiClient = getAPIClient(apiConfig);
			return Promise.resolve();
		});

		it('should have testnet nethash', () => {
			return expect(apiClient.headers.nethash).to.be.equal(testnetNethash);
		});

		it('should have currentNode as the default testnet node', () => {
			return expect(apiClient.currentNode).to.be.equal(testnetNode);
		});
	});

	describe('when the network is set to nethash and nodes are provided', () => {
		beforeEach(() => {
			apiConfig = {
				network:
					'ef3844327d1fd0fc5aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2b7e859e9ca0c',
				nodes: ['http://localhost:4000'],
			};
			apiClient = getAPIClient(apiConfig);
			return Promise.resolve();
		});

		it('should have the custom nethash', () => {
			return expect(apiClient.headers.nethash).to.be.equal(apiConfig.network);
		});

		it('should have currentNode as first element of the api.nodes', () => {
			return expect(apiClient.currentNode).to.be.equal(apiConfig.nodes[0]);
		});
	});

	describe('when the network is set to custom nethash and nodes are empty', () => {
		beforeEach(() => {
			apiConfig = {
				network:
					'ef3844327d1fd0fc5aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2b7e859e9ca0c',
				nodes: [],
			};
			return Promise.resolve();
		});

		it('should throw an error', () => {
			return expect(getAPIClient.bind(null, apiConfig)).to.throw(
				'APIClient requires nodes for initialization.',
			);
		});
	});
});
