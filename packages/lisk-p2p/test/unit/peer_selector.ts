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
import { initializePeerList } from '../utils/peers';
import { PeerOptions, selectPeers } from '../../src/peer_selector';

describe('helpers', () => {
	describe('#selectPeer', () => {
		let peerList = initializePeerList();
		const option: PeerOptions = {
			lastBlockHeight: 545777,
			netHash: '73458irc3yb7rg37r7326dbt7236',
		};
		const goodPeers = [
			{
				_ipAddress: '192.28.138.1',
				_wsPort: 5006,
				_height: 645982,
				_id: '192.28.138.1:5006',
				_inboundSocket: undefined,
			},
			{
				_ipAddress: '18.28.48.1',
				_wsPort: 5008,
				_height: 645980,
				_id: '18.28.48.1:5008',
				_inboundSocket: undefined,
			},
			{
				_ipAddress: '178.21.90.199',
				_wsPort: 5001,
				_height: 645980,
				_id: '178.21.90.199:5001',
				_inboundSocket: undefined,
			},
		];

		describe('get list of n number of good peers', () => {
			beforeEach(async () => {
				peerList = initializePeerList();
			});

			it('should return an array', () => {
				return expect(selectPeers(peerList, option)).to.be.an('array');
			});

			it('returned array should contain good peers according to algorithm', () => {
				return expect(selectPeers(peerList, option))
					.and.be.an('array')
					.and.to.be.eql(goodPeers);
			});

			it('return empty peer list for no peers as an argument', () => {
				return expect(selectPeers([], option))
					.and.be.an('array')
					.and.to.be.eql([]);
			});

			it('should return an array having one good peer', () => {
				return expect(selectPeers(peerList, option, 1))
					.and.be.an('array')
					.and.of.length(1);
			});

			it('should return an array having 2 good peers', () => {
				return expect(selectPeers(peerList, option, 2))
					.and.be.an('array')
					.and.of.length(2);
			});

			it('should return an array having all good peers', () => {
				return expect(selectPeers(peerList, option, 0))
					.and.be.an('array')
					.and.of.length(3);
			});

			it('should return an array having all good peers ignoring requested negative number of peers', () => {
				return expect(selectPeers(peerList, option, -1))
					.and.be.an('array')
					.and.of.length(3);
			});

			it('should return an array of equal length equal to requested number of peers', () => {
				return expect(selectPeers(peerList, option, 3))
					.and.be.an('array')
					.and.of.length(3);
			});

			it('should throw an error when requested peers are greater than available good peers', () => {
				return expect(selectPeers.bind(selectPeers, peerList, option, 4))
					.to.throw(
						`Requested number of peers: '4' is more than the available number of good peers: '3'`,
					)
					.to.have.property('name')
					.eql('NotEnoughPeersError');
			});
		});

		describe('peers with lower blockheight', () => {
			beforeEach(async () => {
				peerList = initializePeerList();
			});
			const lowHeightPeers = peerList.filter(
				peer => peer.height < option.blockHeight,
			);

			it('should return an array with 0 good peers', () => {
				return expect(selectPeers(lowHeightPeers, option, 2))
					.and.be.an('array')
					.and.of.length(0);
			});
		});
	});
});
