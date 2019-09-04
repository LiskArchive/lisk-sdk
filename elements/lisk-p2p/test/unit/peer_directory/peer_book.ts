/*
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
import { initializePeerInfoList } from '../../utils/peers';
import { PeerBook, PeerBookConfig } from '../../../src/peer_directory';

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
			expect(peerBook.newList).length(0);
			expect(peerBook.triedList).length(0);
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
			expect(peerBook.newList).length(1);
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
			expect(peerBook.newList).length(1);
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

		it('should add peer to the tried peer list', async () => {
			expect(peerBook.triedList).length(1);
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

		it('should remove a peer when downgraded without any upgrade after addition to the peer list', async () => {
			// The added peer is in newPeers
			expect(peerBook.newList).length(1);
			// Downgrade the peer over disconnection or any other event
			peerBook.downgradePeer(samplePeers[0]);
			// Peer should be deleted completely since it was only residing inside newPeers
			expect(peerBook.getAllPeers()).length(0);
		});

		it('should add peer to the new peer list when downgraded 3 times after an upgrade', async () => {
			peerBook.upgradePeer(samplePeers[0]);
			// Should move to triedPeers
			expect(peerBook.triedList).length(1);
			peerBook.downgradePeer(samplePeers[0]); // Downgrade the peer over disconnection or any other event
			peerBook.downgradePeer(samplePeers[0]);
			peerBook.downgradePeer(samplePeers[0]);
			expect(peerBook.triedList).length(0);
			// Should move to newPeers
			expect(peerBook.newList).length(1);
			expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
		});

		it('should remove a peer from all peer lists when downgraded 4 times after one upgrade before', async () => {
			peerBook.upgradePeer(samplePeers[0]);
			// Should move to triedPeers
			expect(peerBook.triedList).length(1);
			peerBook.downgradePeer(samplePeers[0]); // Downgrade the peer over disconnection or any other event
			peerBook.downgradePeer(samplePeers[0]);
			peerBook.downgradePeer(samplePeers[0]);
			expect(peerBook.triedList).length(0);
			// Should move to newPeers
			expect(peerBook.newList).length(1);
			peerBook.downgradePeer(samplePeers[0]);
			expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
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
			expect(peerBook.triedList).length(0);
			expect(peerBook.newList).length(0);
			expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
		});
	});
});
