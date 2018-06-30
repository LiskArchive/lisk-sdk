/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import getAPIClient from '../../src/utils/api';

describe('api utils', () => {
	let apiClient;
	let apiConfig;

	const mainnetNethash =
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
	const testnetNethash =
		'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const testnetNode = 'http://testnet.lisk.io:7000';

	describe('when the network is set to main', () => {
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

	describe('when the network is set to test', () => {
		beforeEach(() => {
			apiConfig = {
				network: 'test',
				nodes: ['http://localhost:4000'],
			};
			apiClient = getAPIClient(apiConfig);
			return Promise.resolve();
		});

		it('should have mainnet nethash', () => {
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

		it('should have mainnet nethash', () => {
			return expect(apiClient.headers.nethash).to.be.equal(testnetNethash);
		});

		it('should have currentNode as first element of the api.nodes', () => {
			return expect(apiClient.currentNode).to.be.equal(testnetNode);
		});
	});

	describe('when the network is set to nethash', () => {
		beforeEach(() => {
			apiConfig = {
				network:
					'ef3844327d1fd0fc5aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2b7e859e9ca0c',
				nodes: ['http://localhost:4000'],
			};
			apiClient = getAPIClient(apiConfig);
			return Promise.resolve();
		});

		it('should have mainnet nethash', () => {
			return expect(apiClient.headers.nethash).to.be.equal(apiConfig.network);
		});

		it('should have currentNode as first element of the api.nodes', () => {
			return expect(apiClient.currentNode).to.be.equal(apiConfig.nodes[0]);
		});
	});
});
