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
import { BaseList } from '../../../src/peer_directory/base_list';
import { initPeerInfoList } from '../../utils/peers';
import { P2PDiscoveredPeerInfo } from '../../../src/p2p_types';
import { PEER_TYPE } from '../../../src/utils';
import {
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_RANDOM_SECRET,
} from '../../../src/constants';

describe('Peer list base', () => {
	const peerListConfig = {
		peerBucketSize: DEFAULT_NEW_BUCKET_SIZE,
		peerBucketCount: DEFAULT_NEW_BUCKET_COUNT,
		secret: DEFAULT_RANDOM_SECRET,
		peerType: PEER_TYPE.TRIED_PEER,
	};
	let peerListObj: BaseList;
	let samplePeers: ReadonlyArray<P2PDiscoveredPeerInfo>;

	describe('#constructor', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
		});

		it(`should set properties correctly and create a map of ${DEFAULT_NEW_BUCKET_COUNT} size with ${DEFAULT_NEW_BUCKET_COUNT} buckets each`, () => {
			expect((peerListObj as any).peerListConfig).to.be.eql(peerListConfig);
			expect((peerListObj as any).peerListConfig.peerBucketSize).to.be.equal(
				DEFAULT_NEW_BUCKET_SIZE,
			);
			expect((peerListObj as any).peerListConfig.peerBucketCount).to.be.equal(
				DEFAULT_NEW_BUCKET_COUNT,
			);
		});
	});

	describe('#peerList', () => {
		let triedPeersArray: ReadonlyArray<P2PDiscoveredPeerInfo>;

		before(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
			peerListObj.addPeer(samplePeers[2]);
			triedPeersArray = peerListObj.peersList as ReadonlyArray<
				P2PDiscoveredPeerInfo
			>;
		});

		it('should return tried peers list', () => {
			const expectedTriedPeersArray = [
				samplePeers[0],
				samplePeers[1],
				samplePeers[2],
			];
			expect(triedPeersArray).to.have.members(expectedTriedPeersArray);
		});
	});

	describe('#initPeerInfo', () => {
		it('should init peer info');
	});

	describe('#getPeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
		});

		describe('when peer exists in the peerMap', () => {
			it('should get the peer from the incoming peerId', () => {
				expect(peerListObj.getPeer(samplePeers[0]))
					.to.be.an('object')
					.and.eql(samplePeers[0]);
			});
		});

		describe('when peer does not exist in the peerMap', () => {
			it('should return undefined for the given peer that does not exist in peerMap', () => {
				const randomPeer = initPeerInfoList()[2];
				expect(peerListObj.getPeer(randomPeer)).to.be.undefined;
			});
		});
	});

	describe('#addPeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
		});

		it('should add the incoming peer if it does not exist already', () => {
			expect(peerListObj.getPeer(samplePeers[0])).eql(samplePeers[0]);
		});

		it('should not add the incoming peer if it exists', () => {
			try {
				peerListObj.addPeer(samplePeers[0]);
			} catch (e) {
				expect(e).to.be.an('error');
				expect(e.message).to.be.eql('Peer already exists');
			}
		});

		it('should call makeSpace method', () => {
			expect(peerListObj.getPeer(samplePeers[0])).eql(samplePeers[0]);
		});

		describe('when bucket is full', () => {
			it('should return evicted peer');
		});

		describe('when bucket is not full', () => {
			it('should return undefined');
		});
	});

	describe('#updatePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
		});

		describe('when trying to update a peer that exist', () => {
			it('should update the peer from the incoming peerInfo', () => {
				let updatedPeer = {
					...samplePeers[0],
					height: 0,
					version: '1.2.3',
				};

				const success = peerListObj.updatePeer(updatedPeer);
				expect(success).to.be.true;
				expect(peerListObj.getPeer(samplePeers[0])).to.be.eql(updatedPeer);
			});
		});

		describe('when trying to update a peer that does not exist', () => {
			it('should return false when the peer does not exist', () => {
				let updatedPeer = {
					...samplePeers[2],
					height: 0,
					version: '1.2.3',
				};

				const success = peerListObj.updatePeer(updatedPeer);
				expect(success).to.be.false;
			});
		});
	});

	describe('#removePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
		});

		it('should remove the peer from the incoming peerInfo', () => {
			peerListObj.removePeer(samplePeers[0]);
			expect(peerListObj.getPeer(samplePeers[0])).to.be.undefined;
		});
	});

	describe('#getBucket', () => {
		it('should get a bucket');
	});

	describe('#makeSpace', () => {
		it('should call get bucket');

		describe('when bucket is full', () => {
			it('should evict one peer randomly');
		});

		describe('when bucket is not full', () => {
			it('should not evict any peer');
		});
	});

	describe('#failedConnectionAction', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerListObj = new BaseList(peerListConfig);
			peerListObj.addPeer(samplePeers[0]);
			peerListObj.addPeer(samplePeers[1]);
		});

		describe('when the peer exist and applied failedConnectionAction', () => {
			it('should delete the peer and for the second call it should return false', () => {
				const success1 = peerListObj.failedConnectionAction(samplePeers[0]);
				expect(success1).to.be.true;
				const success2 = peerListObj.failedConnectionAction(samplePeers[0]);
				expect(success2).to.be.false;
			});
		});
	});
});
