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
import {
	getIPGroup,
	isPrivate,
	isLocal,
	getNetwork,
	getIPBytes,
	getNetgroup,
	NETWORK,
	getBucketId,
	PEER_TYPE,
	expirePeerFromBucket,
} from '../../../src/utils';
import { DEFAULT_EVICTION_THRESHOLD_TIME, DEFAULT_RANDOM_SECRET } from '../../../src/constants';
import { initPeerInfoList } from '../../utils/peers';
import { P2PEnhancedPeerInfo } from '../../../src/types';

describe('utils/network', () => {
	const MAX_GROUP_NUM = 255;
	const MAX_NEW_BUCKETS = 128;
	const MAX_TRIED_BUCKETS = 64;
	const MAX_PEER_ADDRESSES = 65025;
	const secret = 3944604511; // Use fixed valued instead DEFAULT_RANDOM_SECRET for expectation
	const IPv4Address = '1.160.10.240';
	const secondIPv4Address = '1.161.10.240';
	const sourceIPv4Address = '1.165.10.240';
	const privateAddress = '10.0.0.0';
	const localAddress = '127.0.0.1';

	describe('#getIPGroup', () => {
		it('should return first group when passing 0 in second argument', () => {
			const byte = getIPGroup(IPv4Address, 0);
			return expect(byte).toEqual(1);
		});

		it('should throw an error for second argument greater than 3', () => {
			expect(() => getIPGroup(IPv4Address, 4)).toThrow('Invalid IP group.');
		});
	});

	describe('#getIPBytes', () => {
		it('should return an object with property groupABytes', () => {
			return expect(getIPBytes(IPv4Address)).toHaveProperty('aBytes');
		});

		it('should return an object with property groupBBytes', () => {
			return expect(getIPBytes(IPv4Address)).toHaveProperty('bBytes');
		});

		it('should return an object with property groupCBytes', () => {
			return expect(getIPBytes(IPv4Address)).toHaveProperty('cBytes');
		});

		it('should return an object with property groupDBytes', () => {
			return expect(getIPBytes(IPv4Address)).toHaveProperty('dBytes');
		});
	});

	describe('#isPrivate', () => {
		it('should return true for private IP address', () => {
			return expect(isPrivate(privateAddress)).toBe(true);
		});
	});

	describe('#isLocal', () => {
		it('should return true for local IP address', () => {
			return expect(isLocal(localAddress)).toBe(true);
		});
	});

	describe('#getNetwork', () => {
		it(`should return ${NETWORK.NET_IPV4} for IPv4 address`, () => {
			return expect(getNetwork(IPv4Address)).toEqual(NETWORK.NET_IPV4);
		});

		it(`should return ${NETWORK.NET_PRIVATE} for private address`, () => {
			return expect(getNetwork(privateAddress)).toEqual(NETWORK.NET_PRIVATE);
		});

		it(`should return ${NETWORK.NET_LOCAL} for local address`, () => {
			return expect(getNetwork(localAddress)).toEqual(NETWORK.NET_LOCAL);
		});
	});

	describe('#getNetgroup', () => {
		it(`should throw an error if network is equal to ${NETWORK.NET_OTHER}`, () => {
			expect(() => getNetgroup('wrong ipAddress', DEFAULT_RANDOM_SECRET)).toThrow(
				'IP address is unsupported.',
			);
		});

		it('should return a number netgroup', () => {
			return expect(getNetgroup(IPv4Address, secret)).toEqual(expect.any(Number));
		});

		it('should return different netgroup for different addresses', () => {
			const anotherSecondIPv4Address = '1.161.10.240';
			const firstNetgroup = getNetgroup(IPv4Address, secret);
			const secondNetgroup = getNetgroup(anotherSecondIPv4Address, secret);

			return expect(firstNetgroup).not.toEqual(secondNetgroup);
		});

		it('should return same netgroup for unique local addresses', () => {
			const firstNetgroup = getNetgroup(localAddress, secret);
			const secondLocalAddress = '127.0.1.1';
			const secondNetgroup = getNetgroup(secondLocalAddress, secret);

			return expect(firstNetgroup).toEqual(secondNetgroup);
		});

		it('should return same netgroup for unique private addresses', () => {
			const firstNetgroup = getNetgroup(privateAddress, secret);
			const secondPrivateAddress = '10.0.0.1';
			const secondNetgroup = getNetgroup(secondPrivateAddress, secret);

			return expect(firstNetgroup).toEqual(secondNetgroup);
		});

		it('should return different netgroups for local and private addresses', () => {
			const firstNetgroup = getNetgroup(localAddress, secret);
			const secondNetgroup = getNetgroup(privateAddress, secret);

			return expect(firstNetgroup).not.toEqual(secondNetgroup);
		});
	});

	describe('#evictPeerRandomlyFromBucket', () => {
		it.todo('must return the evicted peer info');
	});

	describe('#expirePeerFromBucket', () => {
		let peerBucket: Map<string, P2PEnhancedPeerInfo>;
		const peers = initPeerInfoList();

		beforeEach(() => {
			peerBucket = new Map<string, P2PEnhancedPeerInfo>();

			for (const p of peers) {
				peerBucket.set(p?.peerId, {
					...p,
					dateAdded: new Date(),
				});
			}
		});

		it('should return the evicted peer info when bucket contains old peers', () => {
			const peer1 = peerBucket.get(peers[0].peerId) as P2PEnhancedPeerInfo;
			const timeNow = new Date();
			const oneDayOldTime = new Date(timeNow.getTime() - (DEFAULT_EVICTION_THRESHOLD_TIME + 1000));
			const oldPeer = {
				...peer1,
				dateAdded: oneDayOldTime,
			};
			peerBucket.set(peer1?.peerId, oldPeer);
			expect(expirePeerFromBucket(peerBucket, DEFAULT_EVICTION_THRESHOLD_TIME)).toEqual(oldPeer);
		});

		it('should return undefined when bucket does not contains old peers', () => {
			for (const p of peers) {
				peerBucket.set(p?.peerId, {
					...p,
					dateAdded: new Date(),
				});
			}
			expect(expirePeerFromBucket(peerBucket, DEFAULT_EVICTION_THRESHOLD_TIME)).toBeUndefined();
		});

		it("should return undefined when peers don't have dateAdded field", () => {
			const peerBucketWithoutDateAdded = new Map<string, P2PEnhancedPeerInfo>();
			const peers = initPeerInfoList();
			for (const p of peers) {
				peerBucketWithoutDateAdded.set(p?.peerId, p);
			}
			expect(
				expirePeerFromBucket(peerBucketWithoutDateAdded, DEFAULT_EVICTION_THRESHOLD_TIME),
			).toBeUndefined();
		});
	});

	describe('#getBucketId', () => {
		it('should return a bucket number', () => {
			expect(
				getBucketId({
					secret,
					targetAddress: IPv4Address,
					peerType: PEER_TYPE.NEW_PEER,
					bucketCount: MAX_NEW_BUCKETS,
				}),
			).toSatisfy((n: number) => n >= 0 && n <= MAX_NEW_BUCKETS);
		});

		it('should return a bucket number with source address', () => {
			expect(
				getBucketId({
					secret,
					targetAddress: IPv4Address,
					sourceAddress: secondIPv4Address,
					peerType: PEER_TYPE.NEW_PEER,
					bucketCount: MAX_NEW_BUCKETS,
				}),
			).toSatisfy((n: number) => n >= 0 && n <= MAX_NEW_BUCKETS);
		});

		it(`should throw an error if network is equal to ${NETWORK.NET_OTHER}`, () => {
			expect(() =>
				getBucketId({
					secret,
					targetAddress: 'wrong ipAddress',
					peerType: PEER_TYPE.NEW_PEER,
					bucketCount: MAX_NEW_BUCKETS,
				}),
			).toThrow('IP address is unsupported.');
		});

		it('should return different buckets for different target addresses', () => {
			const anotherSecondIPv4Address = '1.161.10.240';
			const firstBucket = getBucketId({
				secret,
				targetAddress: IPv4Address,
				sourceAddress: IPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});
			const secondBucket = getBucketId({
				secret,
				targetAddress: anotherSecondIPv4Address,
				sourceAddress: anotherSecondIPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			expect(firstBucket).not.toEqual(secondBucket);
		});

		it('should return same bucket for unique local target addresses', () => {
			const firstBucket = getBucketId({
				secret,
				targetAddress: localAddress,
				sourceAddress: localAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});
			const secondLocalAddress = '127.0.1.1';
			const secondBucket = getBucketId({
				secret,
				targetAddress: secondLocalAddress,
				sourceAddress: secondLocalAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			expect(firstBucket).toEqual(secondBucket);
		});

		it('should return same bucket for unique private target addresses', () => {
			const firstBucket = getBucketId({
				secret,
				targetAddress: privateAddress,
				sourceAddress: privateAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});
			const secondPrivateAddress = '10.0.0.1';
			const secondBucket = getBucketId({
				secret,
				targetAddress: secondPrivateAddress,
				sourceAddress: secondPrivateAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			expect(firstBucket).toEqual(secondBucket);
		});

		it('should return different buckets for local and private target addresses', () => {
			const firstBucket = getBucketId({
				secret,
				targetAddress: localAddress,
				sourceAddress: localAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});
			const secondBucket = getBucketId({
				secret,
				targetAddress: privateAddress,
				sourceAddress: privateAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			expect(firstBucket).not.toEqual(secondBucket);
		});

		it('should return the same bucket given random ip addresses in the same group for new peers', () => {
			const collectedBuckets = new Array(MAX_GROUP_NUM)
				.fill(0)
				.map(() => `61.26.254.${Math.floor(Math.random() * 256)}`)
				.map(address =>
					getBucketId({
						secret,
						targetAddress: address,
						sourceAddress: address,
						peerType: PEER_TYPE.NEW_PEER,
						bucketCount: MAX_NEW_BUCKETS,
					}),
				);
			const firstBucket = collectedBuckets[0];
			expect(collectedBuckets.every(bucket => bucket === firstBucket)).toBe(true);
		});

		it('should return NaN if bucketCount is 0', () => {
			const bucketId = getBucketId({
				secret,
				targetAddress: '61.26.254.123',
				sourceAddress: '61.26.254.123',
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: 0,
			});
			expect(bucketId).toBeNaN();
		});

		it('should return different buckets for different target addresses given a single source address', () => {
			const firstBucket = getBucketId({
				secret,
				targetAddress: IPv4Address,
				sourceAddress: sourceIPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			const secondBucket = getBucketId({
				secret,
				targetAddress: secondIPv4Address,
				sourceAddress: sourceIPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			return expect(firstBucket).not.toEqual(secondBucket);
		});

		it('should return different buckets for same target addresses given different source address', () => {
			const firstBucket = getBucketId({
				secret,
				targetAddress: IPv4Address,
				sourceAddress: sourceIPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			const secondBucket = getBucketId({
				secret,
				targetAddress: IPv4Address,
				sourceAddress: secondIPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			return expect(firstBucket).not.toEqual(secondBucket);
		});

		it('should return different buckets for same target address and source address but different peerType', () => {
			const firstBucket = getBucketId({
				secret,
				targetAddress: IPv4Address,
				sourceAddress: sourceIPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			const secondBucket = getBucketId({
				secret,
				targetAddress: IPv4Address,
				sourceAddress: sourceIPv4Address,
				peerType: PEER_TYPE.TRIED_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			return expect(firstBucket).not.toEqual(secondBucket);
		});

		it('should return an even distribution of peers in each bucket given random ip addresses in different groups for tried peers', () => {
			const expectedPeerCountPerBucketLowerBound = (MAX_PEER_ADDRESSES / MAX_TRIED_BUCKETS) * 0.4;
			const expectedPeerCountPerBucketUpperBound = (MAX_PEER_ADDRESSES / MAX_TRIED_BUCKETS) * 1.7;
			const collectedBuckets = new Array(MAX_PEER_ADDRESSES).fill(0).reduce((prev: any) => {
				const targetAddress = `${Math.floor(Math.random() * 256)}.${Math.floor(
					Math.random() * 256,
				)}.254.1`;
				const bucket = getBucketId({
					secret,
					targetAddress,
					sourceAddress: targetAddress,
					peerType: PEER_TYPE.TRIED_PEER,
					bucketCount: MAX_TRIED_BUCKETS,
				});
				if (!prev[bucket]) {
					// eslint-disable-next-line no-param-reassign
					prev[bucket] = 0;
				}
				// eslint-disable-next-line no-param-reassign
				prev[bucket] += 1;

				return prev;
			}, {});

			Object.values(collectedBuckets).forEach((bucketCount: any) => {
				expect(bucketCount).toBeGreaterThan(expectedPeerCountPerBucketLowerBound);
				expect(bucketCount).toBeLessThan(expectedPeerCountPerBucketUpperBound);
			});
		});

		// The bounds are more tolerant here due to our temporary solution to not include source IP changing the outcome of distribution
		it('should return an even distribution of peers in each bucket given random ip addresses in different groups for new peers', () => {
			const expectedPeerCountPerBucketLowerBound = (MAX_PEER_ADDRESSES / MAX_NEW_BUCKETS) * 0.2;
			const expectedPeerCountPerBucketUpperBound = (MAX_PEER_ADDRESSES / MAX_NEW_BUCKETS) * 2.7;
			const collectedBuckets = new Array(MAX_PEER_ADDRESSES).fill(0).reduce((prev: any) => {
				const targetAddress = `${Math.floor(Math.random() * 256)}.${Math.floor(
					Math.random() * 256,
				)}.254.1`;
				const bucket = getBucketId({
					secret,
					targetAddress,
					sourceAddress: targetAddress,
					peerType: PEER_TYPE.NEW_PEER,
					bucketCount: MAX_NEW_BUCKETS,
				});
				if (!prev[bucket]) {
					// eslint-disable-next-line no-param-reassign
					prev[bucket] = 0;
				}
				// eslint-disable-next-line no-param-reassign
				prev[bucket] += 1;

				return prev;
			}, {});
			Object.values(collectedBuckets).forEach((bucketCount: any) => {
				expect(bucketCount).toBeGreaterThan(expectedPeerCountPerBucketLowerBound);
				expect(bucketCount).toBeLessThan(expectedPeerCountPerBucketUpperBound);
			});
		});
	});
});
