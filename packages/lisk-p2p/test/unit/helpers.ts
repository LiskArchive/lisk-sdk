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
import { PeerOptions, selectPeers } from '../../src';

describe('helpers', () => {
	describe('#selectPeer', () => {
		let peerList = initializePeerList();
		const option: PeerOptions = {
			blockHeight: 545777,
			netHash: '73458irc3yb7rg37r7326dbt7236',
		};
		const goodPeers = [
			{
				_ip: '192.28.138.1',
				_wsPort: 5006,
				_height: 645982,
			},
			{
				_ip: '18.28.48.1',
				_wsPort: 5008,
				_height: 645980,
			},
		];
		describe('get list of n number of good peers', () => {
			beforeEach(async () => {
				peerList = initializePeerList();
			});
			it('should return an object', () => {
				return expect(selectPeers(peerList, option)).to.be.an('object');
			});
			it('should return an object with option property', () => {
				return expect(selectPeers(peerList, option)).to.have.property(
					'options',
				);
			});
			it('should return an object with peers property', () => {
				return expect(selectPeers(peerList, option)).to.have.property('peers');
			});
			it('peers property should contain an array of peers', () => {
				return expect(selectPeers(peerList, option))
					.to.have.property('peers')
					.and.be.an('array');
			});
			it('peers property should contain good peers', () => {
				return expect(selectPeers(peerList, option))
					.to.have.property('peers')
					.and.be.an('array')
					.and.to.be.eql(goodPeers);
			});
			it('return empty peer list for no peers', () => {
				return expect(selectPeers([], option))
					.to.have.property('peers')
					.and.be.an('array')
					.and.to.be.eql([]);
			});
			it('should return an object with peers property', () => {
				return expect(selectPeers(peerList, option, 1))
					.to.have.property('peers')
					.and.be.an('array')
					.and.of.length(1);
			});
			it('should return an object with peers property', () => {
				return expect(selectPeers(peerList, option, 2))
					.to.have.property('peers')
					.and.be.an('array')
					.and.of.length(2);
			});
			it('should return an object with peers property', () => {
				return expect(selectPeers.bind(selectPeers, peerList, option, 3))
					.to.throw(
						`Requested no. of peers: '3' is more than the available no. of good peers: '2'`,
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
				peer => peer.Height < option.blockHeight,
			);
			it('should return an object with peers property', () => {
				return expect(selectPeers(lowHeightPeers, option, 2))
					.to.have.property('peers')
					.and.be.an('array')
					.and.of.length(0);
			});
		});
	});
});
