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
import {
	initPeerInfoList,
	initPeerInfoListWithSuffix,
} from '../../utils/peers';
import { PeerBook, PeerBookConfig } from '../../../src/peer_book';
import {
	DEFAULT_RANDOM_SECRET,
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_TRIED_BUCKET_COUNT,
	DEFAULT_TRIED_BUCKET_SIZE,
} from '../../../src/constants';
import { P2PPeerInfo } from '../../../src/p2p_types';
import { PEER_TYPE } from '../../../src/utils';
import { ExistingPeerError } from '../../../src/errors';

describe('peerBook', () => {
	const peerBookConfig: PeerBookConfig = {
		secret: DEFAULT_RANDOM_SECRET,
	};
	let peerBook: PeerBook;
	let samplePeers: ReadonlyArray<P2PPeerInfo>;

	describe('#constructor', () => {
		it('should intialize blank peer lists and set the secret', () => {
			peerBook = new PeerBook(peerBookConfig);
			expect(peerBook).to.be.an('object');
			expect(peerBook.newPeers).length(0);
			expect(peerBook.triedPeers).length(0);
			expect((peerBook as any)._newPeers.peerListConfig.secret).to.eql(
				DEFAULT_RANDOM_SECRET,
			);
			expect((peerBook as any)._newPeers.peerListConfig.peerBucketCount).to.eql(
				DEFAULT_NEW_BUCKET_COUNT,
			);
			expect((peerBook as any)._newPeers.peerListConfig.peerBucketSize).to.eql(
				DEFAULT_NEW_BUCKET_SIZE,
			);
			expect((peerBook as any)._newPeers.peerListConfig.peerType).to.eql(
				PEER_TYPE.NEW_PEER,
			);
			expect((peerBook as any)._triedPeers.peerListConfig.secret).to.eql(
				DEFAULT_RANDOM_SECRET,
			);
			expect(
				(peerBook as any)._triedPeers.peerListConfig.peerBucketCount,
			).to.eql(DEFAULT_TRIED_BUCKET_COUNT);
			expect(
				(peerBook as any)._triedPeers.peerListConfig.peerBucketSize,
			).to.eql(DEFAULT_TRIED_BUCKET_SIZE);
			expect((peerBook as any)._triedPeers.peerListConfig.peerType).to.eql(
				PEER_TYPE.TRIED_PEER,
			);
		});

		it('should intialize with custom list configs', () => {
			const newListConfig = {
				secret: 111,
				peerBucketCount: 1,
				peerBucketSize: 1,
				peerType: PEER_TYPE.NEW_PEER,
			};
			const triedListConfig = {
				secret: 222,
				peerBucketCount: 2,
				peerBucketSize: 2,
				peerType: PEER_TYPE.TRIED_PEER,
			};
			const secret = 33333;
			peerBook = new PeerBook({ secret, newListConfig, triedListConfig });
			expect(peerBook).to.be.an('object');
			expect((peerBook as any)._newPeers.peerListConfig).to.eql(newListConfig);
			expect((peerBook as any)._triedPeers.peerListConfig).to.eql(
				triedListConfig,
			);
		});
	});

	describe('#newPeers', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		it('should get new peers', () => {
			peerBook.addPeer(samplePeers[0]);
			expect(peerBook.newPeers).to.be.eql([samplePeers[0]]);
		});
	});

	describe('#triedPeers', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		it('should get tried peers', () => {
			peerBook.addPeer(samplePeers[0]);
			peerBook.upgradePeer(samplePeers[0]);
			peerBook.addPeer(samplePeers[1]);
			expect(peerBook.triedPeers).to.be.eql([samplePeers[0]]);
		});
	});

	describe('#allPeers', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		it('should get all peers', () => {
			peerBook.addPeer(samplePeers[0]);
			peerBook.upgradePeer(samplePeers[0]);
			peerBook.addPeer(samplePeers[1]);
			expect(peerBook.allPeers).to.be.eql([samplePeers[1], samplePeers[0]]);
		});
	});

	describe('#getPeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		describe('when peer exists in the tried peers list', () => {
			it('should return the peer info', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
			});
		});

		describe('when peer exists in the new peers list', () => {
			it('should return the peer info', () => {
				peerBook.addPeer(samplePeers[0]);
				expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
			});
		});

		describe('when peer does not exist in the peer book', () => {
			it('should return undefined', () => {
				expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
			});
		});
	});

	describe('#addPeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
			peerBook.addPeer(samplePeers[0]);
		});

		describe('when peer exists in the new peers list', () => {
			it('should throw ExistingPeerError', () => {
				expect(() => peerBook.addPeer(samplePeers[0]))
					.to.throw(ExistingPeerError, 'Peer already exists')
					.and.have.property('peerInfo', samplePeers[0]);
			});
		});

		describe('when peer exists in the tried peers list', () => {
			it('should throw ExistingPeerError', () => {
				expect(() => {
					peerBook.upgradePeer(samplePeers[0]);
					peerBook.addPeer(samplePeers[0]);
				})
					.to.throw(ExistingPeerError, 'Peer already exists')
					.and.have.property('peerInfo', samplePeers[0]);
			});
		});

		describe('when peer does not exist in the peer book', () => {
			it('should add peer to the new peers list', () => {
				expect(peerBook.newPeers).length(1);
				expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
			});
		});
	});

	describe('#updatePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		describe('when peer exists in the tried peers list', () => {
			it('should return true', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				expect(peerBook.updatePeer(samplePeers[0])).to.be.true;
			});
		});

		describe('when peer exists in the new peers list', () => {
			it('should return true', () => {
				peerBook.addPeer(samplePeers[0]);
				expect(peerBook.updatePeer(samplePeers[0])).to.be.true;
			});
		});

		describe('when peer does not exist in the peer book', () => {
			it('should return false', () => {
				expect(peerBook.updatePeer(samplePeers[0])).to.be.false;
			});
		});
	});

	describe('#removePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		describe('when peer exists in the tried peers list', () => {
			it('should return true', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				expect(peerBook.removePeer(samplePeers[0])).to.be.true;
				expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
			});
		});

		describe('when peer exists in the new peers list', () => {
			it('should return true', () => {
				peerBook.addPeer(samplePeers[0]);
				expect(peerBook.removePeer(samplePeers[0])).to.be.true;
				expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
			});
		});

		describe('when peer does not exists in any of the peer book lists', () => {
			it('should return false', () => {
				expect(peerBook.removePeer(samplePeers[0])).to.be.false;
				expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
			});
		});
	});

	describe('#upgradePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		describe('when peer exists in the tried peers list', () => {
			it('should return true', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				expect(peerBook.upgradePeer(samplePeers[0])).to.be.true;
			});
		});

		describe('when peer exists in the new peers list', () => {
			it('should return true', () => {
				peerBook.addPeer(samplePeers[0]);
				expect(peerBook.upgradePeer(samplePeers[0])).to.be.true;
			});

			it('should upgrade from newPeers to triedPeers list', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				expect(peerBook.newPeers).length(0);
				expect(peerBook.triedPeers).length(1);
				expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
			});
		});

		describe('when peer does not exists in any of the peer book lists', () => {
			it('should return false', () => {
				expect(peerBook.upgradePeer(samplePeers[0])).to.be.false;
				expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
			});
		});
	});

	describe('#downgradePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		describe('when peer exists in the tried peers list', () => {
			it('should return false when downgrade has occured less than 3 times', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				expect(peerBook.downgradePeer(samplePeers[0])).to.be.false;
				expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
			});

			it('should add peer to the new peer list when downgraded 3 times', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				// Should move to triedPeers
				expect(peerBook.triedPeers).length(1);
				peerBook.downgradePeer(samplePeers[0]); // Downgrade the peer over disconnection or any other event
				peerBook.downgradePeer(samplePeers[0]);
				peerBook.downgradePeer(samplePeers[0]);
				expect(peerBook.triedPeers).length(0);
				// Should move to newPeers
				expect(peerBook.newPeers).length(1);
				expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
			});

			it('should remove a peer from all peer lists when downgraded 4 times', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				// Should move to triedPeers
				expect(peerBook.triedPeers).length(1);
				peerBook.downgradePeer(samplePeers[0]); // Downgrade the peer over disconnection or any other event
				peerBook.downgradePeer(samplePeers[0]);
				peerBook.downgradePeer(samplePeers[0]);
				expect(peerBook.triedPeers).length(0);
				// Should move to newPeers
				expect(peerBook.newPeers).length(1);
				peerBook.downgradePeer(samplePeers[0]);
				expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
			});
		});

		describe('when peer exists in the new peers list', () => {
			it('should return false if disconnection was not successful', () => {
				sandbox
					.stub((peerBook as any)._newPeers, 'failedConnectionAction')
					.returns(false);
				peerBook.addPeer(samplePeers[0]);
				expect(peerBook.newPeers).length(1);
				expect(peerBook.downgradePeer(samplePeers[0])).to.be.false;
				expect(peerBook.getPeer(samplePeers[0])).to.be.eql(samplePeers[0]);
				expect(peerBook.newPeers).length(1);
			});

			it('should return true if disconnection was successful', () => {
				peerBook.addPeer(samplePeers[0]);
				expect(peerBook.newPeers).length(1);
				expect(peerBook.downgradePeer(samplePeers[0])).to.be.true;
				expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
				expect(peerBook.allPeers).length(0);
			});
		});

		describe('when peer does not exists in any of the peer book lists', () => {
			it('should return false', () => {
				expect(peerBook.downgradePeer(samplePeers[0])).to.be.false;
				expect(peerBook.getPeer(samplePeers[0])).to.be.undefined;
			});
		});
	});

	describe('#getDiscoveryPeerList', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoListWithSuffix('204.123.64', 200);
			peerBook = new PeerBook(peerBookConfig);

			samplePeers.forEach(samplePeer => {
				peerBook.addPeer(samplePeer);
			});
		});

		it('should return PeerList random size between range', () => {
			const minPeerListLength = 50;
			const maxPeerListLength = 100;

			expect(
				peerBook.getRandomizedPeerList(minPeerListLength, maxPeerListLength)
					.length,
			).to.be.gt(minPeerListLength - 1);
			expect(
				peerBook.getRandomizedPeerList(minPeerListLength, maxPeerListLength)
					.length,
			).to.be.lt(maxPeerListLength + 1);
		});
	});
});
