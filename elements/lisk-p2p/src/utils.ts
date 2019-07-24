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
import { createHash } from 'crypto';
import { isIPv4 } from 'net';

const SECRET_BUFFER_LENGTH = 4;
const NETWORK_BUFFER_LENGTH = 1;
const PREFIX_BUFFER_LENGTH = 1;
const BYTES_4 = 4;
const BYTES_16 = 16;
const BYTES_64 = 64;
const BYTES_128 = 128;
const NEW_PEERS = 'new';
const TRIED_PEERS = 'tried';

export enum NETWORK {
	NET_IPV4 = 0,
	NET_PRIVATE,
	NET_LOCAL,
	NET_OTHER,
}

export const cryptoHashSha256 = (data: Buffer): Buffer => {
	const dataHash = createHash('sha256');
	dataHash.update(data);

	return dataHash.digest();
};

/* tslint:disable no-magic-numbers */
export const getIPGroup = (address: string, groupNumber: number): number => {
	if (groupNumber > 3) {
		throw new Error('Invalid IP group.');
	}

	return parseInt(address.split('.')[groupNumber], 10);
};

interface AddressBytes {
	readonly aBytes: Buffer;
	readonly bBytes: Buffer;
	readonly cBytes: Buffer;
	readonly dBytes: Buffer;
}

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

export const isPrivate = (address: string) =>
	getIPGroup(address, 0) === 10 ||
	(getIPGroup(address, 0) === 172 &&
		(getIPGroup(address, 1) >= 16 || getIPGroup(address, 1) <= 31));

export const isLocal = (address: string) =>
	getIPGroup(address, 0) === 127 || getIPGroup(address, 0) === 0;
/* tslint:enable no-magic-numbers */

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

	// Get prefix bytes of ip address to bucket
	const { aBytes, bBytes } = getIPBytes(address);

	// Check if ip address is unsupported network type
	if (network === NETWORK.NET_OTHER) {
		throw Error('IP address is unsupported.');
	}

	// Seperate buckets for local and private addresses
	if (network !== NETWORK.NET_IPV4) {
		return cryptoHashSha256(
			Buffer.concat([secretBytes, networkBytes]),
		).readUInt32BE(0);
	}

	const netgroupBytes = Buffer.concat([
		secretBytes,
		networkBytes,
		aBytes,
		bBytes,
	]);

	return cryptoHashSha256(netgroupBytes).readUInt32BE(0);
};

// For new peer buckets, provide the source IP address from which the peer list was received
export const getBucket = (options: {
	readonly secret: number;
	readonly targetAddress: string;
	readonly sourceAddress?: string;
}): number => {
	const { secret, targetAddress, sourceAddress } = options;
	const peerListType = sourceAddress ? NEW_PEERS : TRIED_PEERS;
	const firstMod = peerListType === NEW_PEERS ? BYTES_16 : BYTES_4;
	const secondMod = peerListType === NEW_PEERS ? BYTES_128 : BYTES_64;
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

	// Get prefix bytes of source address from which peer list is received
	const { aBytes: sourceABytes, bBytes: sourceBBytes } = getIPBytes(
		targetAddress,
	);

	// Check if ip address is unsupported network type
	if (network === NETWORK.NET_OTHER) {
		throw Error('IP address is unsupported.');
	}

	// Seperate buckets for local and private addresses
	if (network !== NETWORK.NET_IPV4) {
		return (
			cryptoHashSha256(Buffer.concat([secretBytes, networkBytes])).readUInt32BE(
				0,
			) % secondMod
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
		peerListType === NEW_PEERS
			? cryptoHashSha256(
					Buffer.concat([
						secretBytes,
						networkBytes,
						sourceABytes,
						sourceBBytes,
						targetABytes,
						targetBBytes,
					]),
			  ).readUInt32BE(0) % firstMod
			: cryptoHashSha256(
					Buffer.concat([secretBytes, networkBytes, addressBytes]),
			  ).readUInt32BE(0) % firstMod;

	kBytes.writeUInt32BE(k, 0);

	// New peers: b = Hash(random_secret, source_group, k) % 128
	// Tried peers: b = Hash(random_secret, group, k) % 64
	const bucketBytes =
		peerListType === NEW_PEERS
			? Buffer.concat([
					secretBytes,
					networkBytes,
					sourceABytes,
					sourceBBytes,
					kBytes,
			  ])
			: Buffer.concat([
					secretBytes,
					networkBytes,
					targetABytes,
					targetBBytes,
					kBytes,
			  ]);

	return cryptoHashSha256(bucketBytes).readUInt32BE(0) % secondMod;
};
