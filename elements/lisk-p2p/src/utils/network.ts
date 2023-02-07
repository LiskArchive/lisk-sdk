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
import { isIPv4 } from 'net';

// eslint-disable-next-line import/no-cycle
import { P2PEnhancedPeerInfo } from '../types';

const BYTES_4 = 4;
const BYTES_16 = 16;

export const SECRET_BUFFER_LENGTH = 4;
export const NETWORK_BUFFER_LENGTH = 1;
const PREFIX_BUFFER_LENGTH = 1;

interface AddressBytes {
	readonly aBytes: Buffer;
	readonly bBytes: Buffer;
	readonly cBytes: Buffer;
	readonly dBytes: Buffer;
}

export const getIPGroup = (address: string, groupNumber: number): number => {
	if (groupNumber > 3) {
		throw new Error('Invalid IP group.');
	}

	return parseInt(address.split('.')[groupNumber], 10);
};

// Each byte represents the corresponding subsection of the IP address e.g. AAA.BBB.CCC.DDD
export const getIPBytes = (address: string): AddressBytes => {
	const aBytes = Buffer.alloc(PREFIX_BUFFER_LENGTH);
	aBytes.writeUInt8(getIPGroup(address, 0), 0);
	const bBytes = Buffer.alloc(PREFIX_BUFFER_LENGTH);
	bBytes.writeUInt8(getIPGroup(address, 1), 0);
	const cBytes = Buffer.alloc(PREFIX_BUFFER_LENGTH);
	cBytes.writeUInt8(getIPGroup(address, 2), 0);
	const dBytes = Buffer.alloc(PREFIX_BUFFER_LENGTH);
	dBytes.writeUInt8(getIPGroup(address, 3), 0);

	return {
		aBytes,
		bBytes,
		cBytes,
		dBytes,
	};
};

export enum NETWORK {
	NET_IPV4 = 0,
	NET_PRIVATE,
	NET_LOCAL,
	NET_OTHER,
}

export enum PEER_TYPE {
	NEW_PEER = 'newPeer',
	TRIED_PEER = 'triedPeer',
}

export const isPrivate = (address: string): boolean =>
	getIPGroup(address, 0) === 10 ||
	(getIPGroup(address, 0) === 172 && getIPGroup(address, 1) >= 16 && getIPGroup(address, 1) <= 31);

export const isLocal = (address: string): boolean =>
	getIPGroup(address, 0) === 127 || address === '0.0.0.0';

export const getNetwork = (address: string): NETWORK => {
	if (isLocal(address)) {
		return NETWORK.NET_LOCAL;
	}

	if (isPrivate(address)) {
		return NETWORK.NET_PRIVATE;
	}

	if (isIPv4(address)) {
		return NETWORK.NET_IPV4;
	}

	return NETWORK.NET_OTHER;
};

export const getNetgroup = (address: string, secret: number): number => {
	const secretBytes = Buffer.alloc(SECRET_BUFFER_LENGTH);
	secretBytes.writeUInt32BE(secret, 0);
	const network = getNetwork(address);
	const networkBytes = Buffer.alloc(NETWORK_BUFFER_LENGTH);
	networkBytes.writeUInt8(network, 0);

	// Get prefix bytes of ipAddress to bucket
	const { aBytes, bBytes } = getIPBytes(address);

	// Check if ipAddress is unsupported network type
	if (network === NETWORK.NET_OTHER) {
		throw Error('IP address is unsupported.');
	}

	const netgroupBytes = Buffer.concat([secretBytes, networkBytes, aBytes, bBytes]);

	return hash(netgroupBytes).readUInt32BE(0);
};

export const constructPeerId = (ipAddress: string, port: number): string => `${ipAddress}:${port}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
export const getByteSize = (data: Buffer | object): number => {
	if (Buffer.isBuffer(data)) {
		return data.length;
	}

	return Buffer.byteLength(JSON.stringify(data));
};

export const evictPeerRandomlyFromBucket = (
	bucket: Map<string, P2PEnhancedPeerInfo>,
): P2PEnhancedPeerInfo | undefined => {
	const bucketPeerIds = Array.from(bucket.keys());
	const randomPeerIndex = Math.floor(Math.random() * bucketPeerIds.length);
	const randomPeerId = bucketPeerIds[randomPeerIndex];
	const evictedPeer = bucket.get(randomPeerId);
	bucket.delete(randomPeerId);

	return evictedPeer;
};

export const expirePeerFromBucket = (
	bucket: Map<string, P2PEnhancedPeerInfo>,
	thresholdTime: number,
): P2PEnhancedPeerInfo | undefined => {
	for (const [peerId, peer] of bucket) {
		if (peer.dateAdded) {
			const timeDifference = Math.round(
				Math.abs(new Date().getTime() - peer.dateAdded.getTime()),
			);

			if (timeDifference >= thresholdTime) {
				bucket.delete(peerId);

				return peer;
			}
		}
	}

	return undefined;
};

// For new peer buckets, provide the source IP address from which the peer list was received
export const getBucketId = (options: {
	readonly secret: number;
	readonly peerType: PEER_TYPE;
	readonly targetAddress: string;
	readonly sourceAddress?: string;
	readonly bucketCount: number;
}): number => {
	const { secret, targetAddress, sourceAddress, peerType, bucketCount } = options;
	const firstMod = peerType === PEER_TYPE.NEW_PEER ? BYTES_16 : BYTES_4;
	const secretBytes = Buffer.alloc(SECRET_BUFFER_LENGTH);
	secretBytes.writeUInt32BE(secret, 0);
	const network = getNetwork(targetAddress);
	const networkBytes = Buffer.alloc(NETWORK_BUFFER_LENGTH);
	networkBytes.writeUInt8(network, 0);

	// Get bytes of ipAddress to bucket
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

	// Separate buckets for local and private addresses
	if (network !== NETWORK.NET_IPV4) {
		return hash(Buffer.concat([secretBytes, networkBytes])).readUInt32BE(0) % bucketCount;
	}

	const addressBytes = Buffer.concat([targetABytes, targetBBytes, targetCBytes, targetDBytes]);

	// New peers: k = Hash(random_secret, source_group, group) % 16
	// Tried peers: k = Hash(random_secret, IP) % 4
	const kBytes = Buffer.alloc(firstMod);

	// Get bytes of ip address to bucket
	const sourceBytes = sourceAddress ? getIPBytes(sourceAddress) : undefined;

	const k =
		peerType === PEER_TYPE.NEW_PEER && sourceBytes
			? hash(
					Buffer.concat([
						secretBytes,
						networkBytes,
						sourceBytes.aBytes,
						sourceBytes.bBytes,
						targetABytes,
						targetBBytes,
					]),
			  ).readUInt32BE(0) % firstMod
			: hash(Buffer.concat([secretBytes, networkBytes, addressBytes])).readUInt32BE(0) % firstMod;

	kBytes.writeUInt32BE(k, 0);

	// New peers: b = Hash(random_secret, source_group, k) % 128
	// Tried peers: b = Hash(random_secret, group, k) % 64
	const bucketBytes =
		peerType === PEER_TYPE.NEW_PEER && sourceBytes
			? Buffer.concat([secretBytes, networkBytes, sourceBytes.aBytes, sourceBytes.bBytes, kBytes])
			: Buffer.concat([secretBytes, networkBytes, targetABytes, targetBBytes, kBytes]);

	return hash(bucketBytes).readUInt32BE(0) % bucketCount;
};
