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
 *
 */
import { expect } from 'chai';
import { PeerConfig } from '../../src/peer';
import {
	processPeerListFromResponse,
	getAllPeers,
} from '../../src/rpc_handler';
import { initializePeerList } from '../utils/peers';

describe('rpc handler', () => {
	const peerFromResponse1 = {
		ip: '196.34.89.90',
		wsPort: '5393',
		os: 'darwin',
		height: '23232',
		version: '1.1.2',
	};

	const peerFromResponse2 = {
		ip: '128.38.75.9',
		wsPort: '5393',
		os: 'darwin',
		height: '23232',
		version: '1.1.2',
	};

	const peerFromResponse3 = {
		ip: '12.23.11.31',
		wsPort: '5393',
		os: 'darwin',
		height: '23232',
		version: '1.1.2',
	};
	let peersFromResponse = [
		peerFromResponse1,
		peerFromResponse2,
		peerFromResponse3,
	];

	let newlyCreatedPeers = peersFromResponse.map(peer => {
		const peerWithConfig: PeerConfig = {
			ipAddress: peer.ip,
			wsPort: +peer.wsPort,
			height: +peer.height,
			os: peer.os,
			version: peer.version,
		};

		return peerWithConfig;
	});

	describe('#processPeerListFromResponse', () => {
		let peersRPCHandler: ReadonlyArray<PeerConfig>;
		let response: unknown;

		beforeEach(async () => {
			response = { peers: peersFromResponse };
			peersRPCHandler = processPeerListFromResponse(response);
		});

		it('should return an array of length [3] for a valid response', () => {
			return expect(peersRPCHandler)
				.to.be.an('array')
				.and.of.length(3);
		});

		it('should return an array of instantiated peers for a valid response', () => {
			return expect(peersRPCHandler)
				.to.be.an('array')
				.eql(newlyCreatedPeers);
		});

		it('should return a blank array of instantiated peers for undefined response', () => {
			peersRPCHandler = processPeerListFromResponse(undefined);

			return expect(peersRPCHandler)
				.to.be.an('array')
				.eql([]);
		});

		it('should return a blank array of instantiated peers for string type response', () => {
			peersRPCHandler = processPeerListFromResponse('string value');

			return expect(peersRPCHandler)
				.to.be.an('array')
				.eql([]);
		});

		it('should throw an error for invalid version', () => {
			const badResponse = {
				peers: [
					{
						ip: '127.34.00.78',
						wsPort: '5001',
						height: '453453',
						os: 'windows',
						version: '1.2.187hhjbv',
					},
				],
			};

			return expect(
				processPeerListFromResponse.bind(null, badResponse),
			).to.throw('Invalid peer version');
		});
	});

	describe('getAllPeers', () => {
		let getallPeersFunc: any;
		const samplePeers = initializePeerList();
		const seedPeer1 = samplePeers[0];
		const seedPeer2 = samplePeers[1];
		const peerList1 = [peerFromResponse1, peerFromResponse2];
		const peerList2 = [peerFromResponse1, peerFromResponse3];
		const seedList = [seedPeer1, seedPeer2];

		const validatedPeer1: PeerConfig = {
			ipAddress: '196.34.89.90',
			wsPort: 5393,
			os: 'darwin',
			height: 23232,
			version: '1.1.2',
		};

		const validatedPeer2: PeerConfig = {
			ipAddress: '128.38.75.9',
			wsPort: 5393,
			os: 'darwin',
			height: 23232,
			version: '1.1.2',
		};

		const validatedPeer3: PeerConfig = {
			ipAddress: '12.23.11.31',
			wsPort: 5393,
			os: 'darwin',
			height: 23232,
			version: '1.1.2',
		};
		const expectedResult = [
			[validatedPeer1, validatedPeer2],
			[validatedPeer1, validatedPeer3],
		];

		beforeEach(async () => {
			sandbox
				.stub(seedPeer1, 'request')
				.resolves({ data: { peers: peerList1 } });
			sandbox
				.stub(seedPeer2, 'request')
				.resolves({ data: { peers: peerList2 } });

			getallPeersFunc = await getAllPeers(seedList);
		});

		it('return a list of peers with array length of [2] from the given seed list', async () => {
			return expect(getallPeersFunc)
				.to.be.an('array')
				.of.length(2);
		});

		it('return a list of peers from the given seed list with expected array of peerlist', async () => {
			return expect(getallPeersFunc)
				.to.be.an('array')
				.and.eql(expectedResult);
		});
	});
});
