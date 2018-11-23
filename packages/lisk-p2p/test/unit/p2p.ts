/* tslint:disable:no-console */
import { expect } from 'chai';

import { P2P, IPeerOptions, IPeerConfig, Peer, selectPeers } from '../../src';

const initializePeerList = (): ReadonlyArray<Peer> => {
	const peerOption1: IPeerConfig = {
		ip: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
	};

	const peerOption2: IPeerConfig = {
		ip: '127.0.0.1',
		wsPort: 5002,
		height: 545981,
	};
	const peerOption3: IPeerConfig = {
		ip: '18.28.48.1',
		wsPort: 5008,
		height: 645980,
	};
	const peerOption4: IPeerConfig = {
		ip: '192.28.138.1',
		wsPort: 5006,
		height: 645982,
	};
	const peer1 = new Peer(peerOption1);
	const peer2 = new Peer(peerOption2);
	const peer3 = new Peer(peerOption3);
	const peer4 = new Peer(peerOption4);

	return [peer1, peer2, peer3, peer4];
};

describe('#Good peers test', () => {
	let peerList = initializePeerList();
	const option: IPeerOptions = {
		blockHeight: 545777,
		netHash: '73458irc3yb7rg37r7326dbt7236',
	};
	const goodPeers = [
		{
			ip: '192.28.138.1',
			wsPort: 5006,
			height: 645982,
		},
		{
			ip: '18.28.48.1',
			wsPort: 5008,
			height: 645980,
		},
	];
	describe('get a good peer list with options', () => {
		const lisk = new P2P();
		it('should be an object', () => {
			return expect(lisk).to.be.an('object');
		});
		it('should be an instance of P2P blockchain', () => {
			return expect(lisk)
				.to.be.an('object')
				.and.be.instanceof(P2P);
		});
		it('should return an object', () => {
			return expect(selectPeers(peerList, option)).to.be.an('object');
		});
		it('should return an object with option property', () => {
			return expect(selectPeers(peerList, option)).to.have.property('options');
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
	});

	describe('Get list of n number of good peers', () => {
		beforeEach(() => {
			peerList = initializePeerList();
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
	});
});
