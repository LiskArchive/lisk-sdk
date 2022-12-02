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
import { initPeerInfoList, initPeerInfoListWithSuffix } from '../../utils/peers';
import { PeerBook, PeerBookConfig } from '../../../src/peer_book';
import {
	DEFAULT_RANDOM_SECRET,
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_TRIED_BUCKET_COUNT,
	DEFAULT_TRIED_BUCKET_SIZE,
	DEFAULT_BAN_TIME,
	PeerKind,
} from '../../../src/constants';
import { P2PPeerInfo } from '../../../src/types';
import { PEER_TYPE } from '../../../src/utils';
import { ExistingPeerError } from '../../../src/errors';

describe('peerBook', () => {
	const seedPeers = initPeerInfoListWithSuffix('2.0.1', 10);
	const fixedPeers = initPeerInfoListWithSuffix('3.0.1', 10);
	const whitelisted = initPeerInfoListWithSuffix('4.0.1', 10);
	const previousPeers = initPeerInfoListWithSuffix('5.0.1', 10);

	const peerBookConfig: PeerBookConfig = {
		sanitizedPeerLists: {
			blacklistedIPs: [],
			seedPeers: [],
			fixedPeers: [],
			whitelisted: [],
			previousPeers: [],
		},
		secret: DEFAULT_RANDOM_SECRET,
	};
	let peerBook: PeerBook;
	let samplePeers: ReadonlyArray<P2PPeerInfo>;

	jest.useFakeTimers();

	describe('#constructor', () => {
		peerBook = new PeerBook({
			...peerBookConfig,
			sanitizedPeerLists: {
				blacklistedIPs: ['192.1.0.1', '192.1.0.1'],
				seedPeers,
				fixedPeers,
				whitelisted,
				previousPeers,
			},
		});

		it('should initialize Peer lists and set the secret', () => {
			expect(peerBook).toEqual(expect.any(Object));
			expect(peerBook.newPeers).toHaveLength(0);
			// fixedPeers +  whitelisted + previousPeers
			expect(peerBook.triedPeers).toHaveLength(30);
			expect((peerBook as any)._newPeers.peerListConfig.secret).toEqual(DEFAULT_RANDOM_SECRET);
			expect((peerBook as any)._newPeers.peerListConfig.numOfBuckets).toEqual(
				DEFAULT_NEW_BUCKET_COUNT,
			);
			expect((peerBook as any)._newPeers.peerListConfig.bucketSize).toEqual(
				DEFAULT_NEW_BUCKET_SIZE,
			);
			expect((peerBook as any)._newPeers.peerListConfig.peerType).toEqual(PEER_TYPE.NEW_PEER);
			expect((peerBook as any)._triedPeers.peerListConfig.secret).toEqual(DEFAULT_RANDOM_SECRET);
			expect((peerBook as any)._triedPeers.peerListConfig.numOfBuckets).toEqual(
				DEFAULT_TRIED_BUCKET_COUNT,
			);
			expect((peerBook as any)._triedPeers.peerListConfig.bucketSize).toEqual(
				DEFAULT_TRIED_BUCKET_SIZE,
			);
			expect((peerBook as any)._triedPeers.peerListConfig.peerType).toEqual(PEER_TYPE.TRIED_PEER);
			expect(peerBook.seedPeers).toHaveLength(10);
			expect(peerBook.fixedPeers).toHaveLength(10);
			expect(peerBook.whitelistedPeers).toHaveLength(10);
			expect(peerBook.bannedIPs).toEqual(expect.any(Set));
			expect(peerBook.bannedIPs.size).toBe(1);
		});

		it('should update PeerKind', () => {
			// Arrange
			let fixedPeerCount = 0;
			let whitelistedPeerCount = 0;
			let seedPeerCount = 0;

			peerBook.seedPeers.forEach(seedPeerInfo => {
				peerBook.addPeer(seedPeerInfo);
			});

			// Assert
			peerBook.allPeers.forEach(peer => {
				// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check,default-case
				switch (peer.internalState?.peerKind) {
					case PeerKind.FIXED_PEER:
						fixedPeerCount += 1;
						break;
					case PeerKind.WHITELISTED_PEER:
						whitelistedPeerCount += 1;
						break;
					case PeerKind.SEED_PEER:
						seedPeerCount += 1;
						break;
				}
			});

			expect(fixedPeerCount).toBe(10);
			expect(whitelistedPeerCount).toBe(10);
			expect(seedPeerCount).toBe(10);
		});
	});

	describe('#newPeers', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		it('should get new peers', () => {
			peerBook.addPeer(samplePeers[0]);
			expect(peerBook.newPeers).toHaveLength(1);
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
			expect(peerBook.triedPeers).toHaveLength(1);
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
			expect(peerBook.allPeers.map(peer => peer.peerId)).toEqual([
				samplePeers[1].peerId,
				samplePeers[0].peerId,
			]);
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
				expect(peerBook.getPeer(samplePeers[0])?.peerId).toEqual(samplePeers[0].peerId);
			});
		});

		describe('when peer exists in the new peers list', () => {
			it('should return the peer info', () => {
				peerBook.addPeer(samplePeers[0]);
				expect(peerBook.getPeer(samplePeers[0])?.peerId).toEqual(samplePeers[0].peerId);
			});
		});

		describe('when peer does not exist in the peer book', () => {
			it('should return undefined', () => {
				expect(peerBook.getPeer(samplePeers[0])).toBeUndefined();
			});
		});
	});

	describe('#hasPeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		it('should return true if peer exists in peer book', () => {
			peerBook.addPeer(samplePeers[0]);
			expect(peerBook.hasPeer(samplePeers[0])).toBe(true);
		});

		it('should return false if peer exists in peer book', () => {
			expect(peerBook.hasPeer(samplePeers[0])).toBe(false);
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
				// 'Peer already exists'
				expect(() => peerBook.addPeer(samplePeers[0])).toThrow(ExistingPeerError);
			});
		});

		describe('when peer exists in the tried peers list', () => {
			it('should throw ExistingPeerError', () => {
				// 'Peer already exists'
				expect(() => {
					peerBook.upgradePeer(samplePeers[0]);
					peerBook.addPeer(samplePeers[0]);
				}).toThrow(ExistingPeerError);
			});
		});

		describe('when peer does not exist in the peer book', () => {
			it('should add peer to the new peers list', () => {
				expect(peerBook.newPeers).toHaveLength(1);
				expect(peerBook.getPeer(samplePeers[0])?.peerId).toEqual(samplePeers[0].peerId);
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
				expect(peerBook.updatePeer(samplePeers[0])).toBe(true);
			});
		});

		describe('when peer exists in the new peers list', () => {
			it('should return true', () => {
				peerBook.addPeer(samplePeers[0]);
				expect(peerBook.updatePeer(samplePeers[0])).toBe(true);
			});
		});

		describe('when peer does not exist in the peer book', () => {
			it('should return false', () => {
				expect(peerBook.updatePeer(samplePeers[0])).toBe(false);
			});
		});
	});

	describe('#removePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		describe('when peer exists in the tried peers list', () => {
			it('should be removed', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				peerBook.removePeer(samplePeers[0]);
				expect(peerBook.getPeer(samplePeers[0])).toBeUndefined();
			});
		});

		describe('when peer exists in the new peers list', () => {
			it('should be removed', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.removePeer(samplePeers[0]);
				expect(peerBook.getPeer(samplePeers[0])).toBeUndefined();
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
				expect(peerBook.upgradePeer(samplePeers[0])).toBe(true);
			});
		});

		describe('when peer exists in the new peers list', () => {
			it('should return true', () => {
				peerBook.addPeer(samplePeers[0]);
				expect(peerBook.upgradePeer(samplePeers[0])).toBe(true);
			});

			it('should upgrade from newPeers to triedPeers list', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				expect(peerBook.newPeers).toHaveLength(0);
				expect(peerBook.triedPeers).toHaveLength(1);
				expect(peerBook.getPeer(samplePeers[0])?.peerId).toEqual(samplePeers[0]?.peerId);
			});
		});

		describe('when peer does not exists in any of the peer book lists', () => {
			it('should return false', () => {
				expect(peerBook.upgradePeer(samplePeers[0])).toBe(false);
				expect(peerBook.getPeer(samplePeers[0])).toBeUndefined();
			});
		});
	});

	describe('#downgradePeer', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoList();
			peerBook = new PeerBook(peerBookConfig);
		});

		describe('when peer exists in the tried peers list', () => {
			it('should return false when downgrade has occurred less than 3 times', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				expect(peerBook.downgradePeer(samplePeers[0])).toBe(false);
				expect(peerBook.getPeer(samplePeers[0])?.peerId).toEqual(samplePeers[0]?.peerId);
			});

			it('should add peer to the new peer list when downgraded 3 times', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				// Should move to triedPeers
				expect(peerBook.triedPeers).toHaveLength(1);
				peerBook.downgradePeer(samplePeers[0]); // Downgrade the peer over disconnection or any other event
				peerBook.downgradePeer(samplePeers[0]);
				peerBook.downgradePeer(samplePeers[0]);
				expect(peerBook.triedPeers).toHaveLength(0);
				// Should move to newPeers
				expect(peerBook.newPeers).toHaveLength(1);
				expect(peerBook.getPeer(samplePeers[0])?.peerId).toEqual(samplePeers[0]?.peerId);
			});

			it('should remove a peer from all peer lists when downgraded 4 times', () => {
				peerBook.addPeer(samplePeers[0]);
				peerBook.upgradePeer(samplePeers[0]);
				// Should move to triedPeers
				expect(peerBook.triedPeers).toHaveLength(1);
				peerBook.downgradePeer(samplePeers[0]); // Downgrade the peer over disconnection or any other event
				peerBook.downgradePeer(samplePeers[0]);
				peerBook.downgradePeer(samplePeers[0]);
				expect(peerBook.triedPeers).toHaveLength(0);
				// Should move to newPeers
				expect(peerBook.newPeers).toHaveLength(1);
				peerBook.downgradePeer(samplePeers[0]);
				expect(peerBook.getPeer(samplePeers[0])).toBeUndefined();
			});
		});

		describe('when peer exists in the new peers list', () => {
			it('should return false if disconnection was not successful', () => {
				// Arrange
				jest.spyOn((peerBook as any)._newPeers, 'failedConnectionAction').mockReturnValue(false);

				// Act
				peerBook.addPeer(samplePeers[0]);

				// Assert

				expect(peerBook.newPeers).toHaveLength(1);
				expect(peerBook.downgradePeer(samplePeers[0])).toBe(false);
				expect(peerBook.getPeer(samplePeers[0])?.peerId).toEqual(samplePeers[0]?.peerId);
				expect(peerBook.newPeers).toHaveLength(1);
			});

			it('should return true if disconnection was successful', () => {
				peerBook.addPeer(samplePeers[0]);
				expect(peerBook.newPeers).toHaveLength(1);
				expect(peerBook.downgradePeer(samplePeers[0])).toBe(true);
				expect(peerBook.getPeer(samplePeers[0])).toBeUndefined();
				expect(peerBook.allPeers).toHaveLength(0);
			});
		});

		describe('when peer does not exists in any of the peer book lists', () => {
			it('should return false', () => {
				expect(peerBook.downgradePeer(samplePeers[0])).toBe(false);
				expect(peerBook.getPeer(samplePeers[0])).toBeUndefined();
			});
		});

		describe('when peer does exists in Fixed,Seed,Whitelisted peers', () => {
			it('should return false', () => {
				expect(peerBook.downgradePeer(fixedPeers[0])).toBe(false);
				expect(peerBook.downgradePeer(seedPeers[0])).toBe(false);
				expect(peerBook.downgradePeer(whitelisted[0])).toBe(false);
			});
		});
	});

	describe('#getRandomizedPeerList', () => {
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
				peerBook.getRandomizedPeerList(minPeerListLength, maxPeerListLength).length,
			).toBeGreaterThan(minPeerListLength - 1);
			expect(
				peerBook.getRandomizedPeerList(minPeerListLength, maxPeerListLength).length,
			).toBeLessThan(maxPeerListLength + 1);
		});
	});

	describe('when PeerBook populated and cleaned up', () => {
		beforeEach(() => {
			samplePeers = initPeerInfoListWithSuffix('204.123.64', 3500);
			peerBook = new PeerBook(peerBookConfig);

			samplePeers.forEach(samplePeer => {
				if (!peerBook.hasPeer(samplePeer)) {
					peerBook.addPeer(samplePeer);
				}

				peerBook.upgradePeer(samplePeer);
			});
		});

		it('should return empty Peer lists', () => {
			const AllPeers = peerBook.allPeers;

			AllPeers.forEach(peer => {
				peerBook.removePeer(peer);
			});

			expect(peerBook.newPeers).toHaveLength(0);
			expect(peerBook.triedPeers).toHaveLength(0);
			expect(peerBook.allPeers).toHaveLength(0);
		});
	});

	describe('#Ban/Unban', () => {
		afterEach(() => {
			peerBook.cleanUpTimers();
		});

		describe('When existing peerIP banned', () => {
			beforeEach(() => {
				peerBook = new PeerBook({
					...peerBookConfig,
					sanitizedPeerLists: {
						blacklistedIPs: [],
						seedPeers,
						fixedPeers,
						whitelisted,
						previousPeers,
					},
				});
			});

			it('should addBannedPeer add IP to bannedIPs', () => {
				// Arrange
				const bannedPeerId = initPeerInfoListWithSuffix('5.0.1', 1)[0].peerId;

				// Act
				peerBook.addBannedPeer(bannedPeerId, DEFAULT_BAN_TIME);

				// Assert
				expect(peerBook.bannedIPs).toEqual(
					new Set([initPeerInfoListWithSuffix('5.0.1', 1)[0].ipAddress]),
				);
				expect((peerBook as any)._unbanTimers).toHaveLength(1);
			});

			it('should remove IP from bannedIPs when bantime is over', () => {
				// Arrange
				const bannedIP = initPeerInfoListWithSuffix('5.0.1', 1)[0].peerId;

				// Act
				peerBook.addBannedPeer(bannedIP, DEFAULT_BAN_TIME);

				jest.advanceTimersByTime(DEFAULT_BAN_TIME);

				// Assert
				expect(peerBook.bannedIPs.size).toBe(0);
			});

			it('should not able to ban Whitelisted ,FixedPeer', () => {
				// Act
				peerBook.addBannedPeer(fixedPeers[0].peerId, DEFAULT_BAN_TIME);
				peerBook.addBannedPeer(whitelisted[0].peerId, DEFAULT_BAN_TIME);

				// Assert
				expect(peerBook.bannedIPs.size).toBe(0);
			});

			it('should able to SeedPeer', () => {
				// Act
				peerBook.addBannedPeer(seedPeers[0].peerId, DEFAULT_BAN_TIME);
				// Assert
				expect(peerBook.bannedIPs.size).toBe(1);
			});

			it('should not able to ban same IP multiple times', () => {
				// Act
				peerBook.addBannedPeer(previousPeers[0].peerId, DEFAULT_BAN_TIME);

				peerBook.addBannedPeer(previousPeers[0].peerId, DEFAULT_BAN_TIME);
				// Assert
				expect((peerBook as any)._unbanTimers).toHaveLength(1);
			});
		});
	});
});
