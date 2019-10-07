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
import { getBucketId } from '../../../src/peer_book/utils';
import { DEFAULT_RANDOM_SECRET } from '../../../src/constants';
import { PEER_TYPE } from '../../../src/utils';

describe('peer_book/utils', () => {
	const MAX_GROUP_NUM = 255;
	const MAX_NEW_BUCKETS = 128;
	const MAX_TRIED_BUCKETS = 64;
	const MAX_PEER_ADDRESSES = 65025;
	const secret = DEFAULT_RANDOM_SECRET;
	const IPv4Address = '1.160.10.240';
	const privateAddress = '10.0.0.0';
	const localAddress = '127.0.0.1';

	describe('#getBucketId', () => {
		it('should return a bucket number', () => {
			return expect(
				getBucketId({
					secret,
					targetAddress: IPv4Address,
					peerType: PEER_TYPE.NEW_PEER,
					bucketCount: MAX_NEW_BUCKETS,
				}),
			).to.be.a('number');
		});

		it('should return different buckets for different target addresses', () => {
			const secondIPv4Address = '1.161.10.240';
			const firstBucket = getBucketId({
				secret,
				targetAddress: IPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});
			const secondBucket = getBucketId({
				secret,
				targetAddress: secondIPv4Address,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			return expect(firstBucket).to.not.eql(secondBucket);
		});

		it('should return same bucket for unique local target addresses', () => {
			const firstBucket = getBucketId({
				secret,
				targetAddress: localAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});
			const secondLocalAddress = '127.0.1.1';
			const secondBucket = getBucketId({
				secret,
				targetAddress: secondLocalAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			return expect(firstBucket).to.eql(secondBucket);
		});

		it('should return same bucket for unique private target addresses', () => {
			const firstBucket = getBucketId({
				secret,
				targetAddress: privateAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});
			const secondPrivateAddress = '10.0.0.1';
			const secondBucket = getBucketId({
				secret,
				targetAddress: secondPrivateAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			return expect(firstBucket).to.eql(secondBucket);
		});

		it('should return different buckets for local and private target addresses', () => {
			const firstBucket = getBucketId({
				secret,
				targetAddress: localAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});
			const secondBucket = getBucketId({
				secret,
				targetAddress: privateAddress,
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: MAX_NEW_BUCKETS,
			});

			return expect(firstBucket).to.not.eql(secondBucket);
		});

		it('should return the same bucket given random ip addresses in the same group for new peers', async () => {
			const collectedBuckets = new Array(MAX_GROUP_NUM)
				.fill(0)
				.map(() => '61.26.254.' + Math.floor(Math.random() * 256))
				.map(address =>
					getBucketId({
						secret,
						targetAddress: address,
						peerType: PEER_TYPE.NEW_PEER,
						bucketCount: MAX_NEW_BUCKETS,
					}),
				);
			const firstBucket = collectedBuckets[0];
			expect(collectedBuckets.every(bucket => bucket === firstBucket)).to.be
				.true;
		});

		it('should return NaN if bucketCount is 0', async () => {
			const bucketId = getBucketId({
				secret,
				targetAddress: '61.26.254.123',
				peerType: PEER_TYPE.NEW_PEER,
				bucketCount: 0,
			});
			expect(bucketId).is.NaN;
		});

		it('should return an even distribution of peers in each bucket given random ip addresses in different groups for tried peers', async () => {
			const expectedPeerCountPerBucketLowerBound =
				(MAX_PEER_ADDRESSES / MAX_TRIED_BUCKETS) * 0.4;
			const expectedPeerCountPerBucketUpperBound =
				(MAX_PEER_ADDRESSES / MAX_TRIED_BUCKETS) * 1.7;
			const collectedBuckets = new Array(MAX_PEER_ADDRESSES)
				.fill(0)
				.reduce((collectedBuckets: any) => {
					const targetAddress = `${Math.floor(
						Math.random() * 256,
					)}.${Math.floor(Math.random() * 256)}.254.1`;
					const bucket = getBucketId({
						secret,
						targetAddress,
						peerType: PEER_TYPE.TRIED_PEER,
						bucketCount: MAX_TRIED_BUCKETS,
					});
					if (!collectedBuckets[bucket]) {
						collectedBuckets[bucket] = 0;
					}
					collectedBuckets[bucket]++;

					return collectedBuckets;
				}, {});

			Object.values(collectedBuckets).forEach((bucketCount: any) => {
				expect(bucketCount).to.be.greaterThan(
					expectedPeerCountPerBucketLowerBound,
				);
				expect(bucketCount).to.be.lessThan(
					expectedPeerCountPerBucketUpperBound,
				);
			});
		});

		// The bounds are more tolerant here due to our temporary solution to not include source IP changing the outcome of distribution
		it('should return an even distribution of peers in each bucket given random ip addresses in different groups for new peers', async () => {
			const expectedPeerCountPerBucketLowerBound =
				(MAX_PEER_ADDRESSES / MAX_NEW_BUCKETS) * 0.2;
			const expectedPeerCountPerBucketUpperBound =
				(MAX_PEER_ADDRESSES / MAX_NEW_BUCKETS) * 2.7;
			const collectedBuckets = new Array(MAX_PEER_ADDRESSES)
				.fill(0)
				.reduce((collectedBuckets: any) => {
					const targetAddress = `${Math.floor(
						Math.random() * 256,
					)}.${Math.floor(Math.random() * 256)}.254.1`;
					const bucket = getBucketId({
						secret,
						targetAddress,
						peerType: PEER_TYPE.NEW_PEER,
						bucketCount: MAX_NEW_BUCKETS,
					});
					if (!collectedBuckets[bucket]) {
						collectedBuckets[bucket] = 0;
					}
					collectedBuckets[bucket]++;

					return collectedBuckets;
				}, {});
			Object.values(collectedBuckets).forEach((bucketCount: any) => {
				expect(bucketCount).to.be.greaterThan(
					expectedPeerCountPerBucketLowerBound,
				);
				expect(bucketCount).to.be.lessThan(
					expectedPeerCountPerBucketUpperBound,
				);
			});
		});
	});
});
