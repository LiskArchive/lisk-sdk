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
import { initializePeerInfoList } from '../../utils/peers';
// import { constructPeerIdFromPeerInfo } from '../../../src/utils';
// import { P2PPeerInfo } from '../../../src/p2p_types';
import { PeerBook, PeerBookConfig } from '../../../src/directory/peer_book';

describe('peerBook', () => {
	const peerBookConfig: PeerBookConfig = {
		secret: 123456,
	};

	describe('#constructor', () => {
		let peerBook: PeerBook;

		beforeEach(async () => {
			peerBook = new PeerBook(peerBookConfig);
		});

		it('should intialize the blank peer lists and set the secret', async () => {
			expect(peerBook).to.be.an('object');
			expect(peerBook.newPeers).length(0);
			expect(peerBook.triedPeers).length(0);
		});
	});

	describe('#addPeer', () => {
		const samplePeers = initializePeerInfoList();
		let peerBook: PeerBook;

		beforeEach(async () => {
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
		});

		it('should add peer to the new peer list', async () => {
			expect(peerBook.newPeers).length(1);
			expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
		});
	});

	describe('#updatePeer', () => {
		const samplePeers = initializePeerInfoList();
		let peerBook: PeerBook;

		beforeEach(async () => {
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
		});

		it('should add peer to the new peer list', async () => {
			expect(peerBook.newPeers).length(1);
			expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
		});
	});

	describe('#upgradePeer', () => {
		const samplePeers = initializePeerInfoList();
		let peerBook: PeerBook;

		beforeEach(async () => {
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
			peerBook.upgradePeer(samplePeers[0]);
		});

		it('should add peer to the new peer list', async () => {
			expect(peerBook.triedPeers).length(1);
			expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
		});
	});

	describe('#downgradePeer', () => {
		const samplePeers = initializePeerInfoList();
		let peerBook: PeerBook;

		beforeEach(async () => {
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
		});

		it('should add peer to the new peer list when downgraded 3 times', async () => {
			peerBook.upgradePeer(samplePeers[0]);
			expect(peerBook.triedPeers).length(1);
			peerBook.downgradePeer(samplePeers[0]);
			peerBook.downgradePeer(samplePeers[0]);
			peerBook.downgradePeer(samplePeers[0]);
			expect(peerBook.triedPeers).length(0);
			expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
		});
	});

	describe('#removePeer', () => {
		const samplePeers = initializePeerInfoList();
		let peerBook: PeerBook;

		beforeEach(async () => {
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
			peerBook.removePeer(samplePeers[0]);
		});

		it('should add peer to the new peer list', async () => {
			expect(peerBook.triedPeers).length(0);
			expect(peerBook.newPeers).length(0);
			expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
		});
	});
});
