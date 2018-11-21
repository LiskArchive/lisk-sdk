/* tslint:disable:no-console */
import { expect } from 'chai';

import { IOptionsLiskPeer, BlockchainP2P } from '../../src';

import {
	IBlockchainPeerConfig,
	BlockchainPeer,
} from '../../src/blockchain-p2p/blockchain_peer';
const initializePeerList = (): ReadonlyArray<BlockchainPeer> => {
	const peerOption1: IBlockchainPeerConfig = {
		ip: '12.12.12.12',
		wsPort: 5001,
		height: 545776,
	};

	const peerOption2: IBlockchainPeerConfig = {
		ip: '127.0.0.1',
		wsPort: 5002,
		height: 545981,
	};
	const peerOption3: IBlockchainPeerConfig = {
		ip: '18.28.48.1',
		wsPort: 5008,
		height: 645980,
	};
	const peerOption4: IBlockchainPeerConfig = {
		ip: '192.28.138.1',
		wsPort: 5006,
		height: 645982,
	};
	const peer1 = new BlockchainPeer(peerOption1);
	const peer2 = new BlockchainPeer(peerOption2);
	const peer3 = new BlockchainPeer(peerOption3);
	const peer4 = new BlockchainPeer(peerOption4);

	return [peer1, peer2, peer3, peer4];
};

describe('#Good peers test', () => {
	const peerList = initializePeerList();
	const option: IOptionsLiskPeer = {
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
		const lisk = new BlockchainP2P();
		it('should be an object', () => {
			return expect(lisk).to.be.an('object');
		});
		it('should be an instance of P2P blockchain', () => {
			return expect(lisk)
				.to.be.an('object')
				.and.be.instanceof(BlockchainP2P);
		});
		it('should return an object', () => {
			return expect(lisk.selectPeers(peerList, option)).to.be.an('object');
		});
		it('should return an object with option property', () => {
			return expect(lisk.selectPeers(peerList, option)).to.have.property(
				'options',
			);
		});
		it('should return an object with peers property', () => {
			return expect(lisk.selectPeers(peerList, option)).to.have.property(
				'peers',
			);
		});
		it('peers property should contain an array of peers', () => {
			return expect(lisk.selectPeers(peerList, option))
				.to.have.property('peers')
				.and.be.an('array');
		});
		it('peers property should contain good peers', () => {
			return expect(lisk.selectPeers(peerList, option))
				.to.have.property('peers')
				.and.be.an('array')
				.and.to.be.eql(goodPeers);
		});
		it('return empty peer list for no peers', () => {
			return expect(lisk.selectPeers([], option))
				.to.have.property('peers')
				.and.be.an('array')
				.and.to.be.eql([]);
		});
	});
});
