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
import { Peer } from '../../src/peer';
import { getPeersRPCHandler } from '../../src/rpc_handler';

describe('rpc Handler', () => {
	let peersFromResponse = [
		{
			ip: '12.45.12.12',
			wsPort: 5002,
			height: 121323,
			os: 'ubuntu',
		},
		{
			ip: '728.34.00.78',
			wsPort: 5001,
			height: 453453,
			os: 'windows',
		},
	];

	let newlyCreatedPeers = peersFromResponse.map(
		peer =>
			new Peer({
				ipAddress: peer.ip,
				wsPort: peer.wsPort,
				height: peer.height,
				os: peer.os,
				id: `${peer.ip}:${peer.wsPort}`,
			}),
	);

	describe('#getPeersRPCHandler', () => {
		let peersRPCHandler: ReadonlyArray<Peer>;
		let response: unknown;

		beforeEach(async () => {
			response = { peers: peersFromResponse };
			peersRPCHandler = getPeersRPCHandler(response);
		});

		it('should return an array', () => {
			return expect(peersRPCHandler)
				.to.be.an('array')
				.and.of.length(2);
		});

		it('should return an array of instantiated peers', () => {
			return expect(peersRPCHandler)
				.to.be.an('array')
				.eql(newlyCreatedPeers);
		});

		it('should return an array of instantiated peers', () => {
			peersRPCHandler = getPeersRPCHandler(undefined);
			return expect(peersRPCHandler)
				.to.be.an('array')
				.eql([]);
		});

		it('should return an array of instantiated peers', () => {
			peersRPCHandler = getPeersRPCHandler('string value');

			return expect(peersRPCHandler)
				.to.be.an('array')
				.eql([]);
		});
	});
});
