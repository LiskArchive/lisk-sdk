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
import { hash } from '@liskhq/lisk-cryptography';
import {
	getIPBytes,
	getNetwork,
	NETWORK,
	NETWORK_BUFFER_LENGTH,
	PEER_TYPE,
	SECRET_BUFFER_LENGTH,
} from '../utils';
import { CustomPeerInfo } from './base_list';

const BYTES_4 = 4;
const BYTES_16 = 16;

export const evictPeerRandomlyFromBucket = (
	bucket: Map<string, CustomPeerInfo>,
): CustomPeerInfo | undefined => {
	const bucketPeerIds = Array.from(bucket.keys());
	const randomPeerIndex = Math.floor(Math.random() * bucketPeerIds.length);
	const randomPeerId = bucketPeerIds[randomPeerIndex];
	const evictedPeer = bucket.get(randomPeerId);
	bucket.delete(randomPeerId);

	return evictedPeer;
};

export const evictAnOldPeerFromBucket = (
	bucket: Map<string, CustomPeerInfo>,
	thresholdTime: number,
): CustomPeerInfo | undefined => {
	// First eviction strategy: eviction by time of residence
	for (const [peerId, peer] of bucket) {
		const timeDifference = Math.round(
			Math.abs(peer.dateAdded.getTime() - new Date().getTime()),
		);

		if (timeDifference >= thresholdTime) {
			bucket.delete(peerId);

			return peer;
		}
	}

	return undefined;
};

// TODO: Source address to be included in hash for later version
export const getBucketId = (options: {
	readonly secret: number;
	readonly peerType: PEER_TYPE;
	readonly targetAddress: string;
	readonly bucketCount: number;
}): number => {
	const { secret, targetAddress, peerType, bucketCount } = options;
	const firstMod = peerType === PEER_TYPE.NEW_PEER ? BYTES_16 : BYTES_4;
	const secretBytes = Buffer.alloc(SECRET_BUFFER_LENGTH);
	secretBytes.writeUInt32BE(secret, 0);
	const network = getNetwork(targetAddress);
	const networkBytes = Buffer.alloc(NETWORK_BUFFER_LENGTH);
	networkBytes.writeUInt8(network, 0);

	// Get bytes of ip address to bucket
	const {
		aBytes: targetABytes,
		bBytes: targetBBytes,
		cBytes: targetCBytes,
		dBytes: targetDBytes,
	} = getIPBytes(targetAddress);

	// Check if ip address is unsupported network type
	if (network === NETWORK.NET_OTHER) {
		throw Error('IP address is unsupported.');
	}

	// Seperate buckets for local and private addresses
	if (network !== NETWORK.NET_IPV4) {
		return (
			hash(Buffer.concat([secretBytes, networkBytes])).readUInt32BE(0) %
			bucketCount
		);
	}

	const addressBytes = Buffer.concat([
		targetABytes,
		targetBBytes,
		targetCBytes,
		targetDBytes,
	]);

	// New peers: k = Hash(random_secret, source_group, group) % 16
	// Tried peers: k = Hash(random_secret, IP) % 4
	const kBytes = Buffer.alloc(firstMod);

	const k =
		peerType === PEER_TYPE.NEW_PEER
			? hash(
					Buffer.concat([
						secretBytes,
						networkBytes,
						targetABytes,
						targetBBytes,
					]),
			  ).readUInt32BE(0) % firstMod
			: hash(
					Buffer.concat([secretBytes, networkBytes, addressBytes]),
			  ).readUInt32BE(0) % firstMod;

	kBytes.writeUInt32BE(k, 0);

	// New peers: b = Hash(random_secret, source_group, k) % 128
	// Tried peers: b = Hash(random_secret, group, k) % 64
	const bucketBytes = Buffer.concat([
		secretBytes,
		networkBytes,
		targetABytes,
		targetBBytes,
		kBytes,
	]);

	return hash(bucketBytes).readUInt32BE(0) % bucketCount;
};
