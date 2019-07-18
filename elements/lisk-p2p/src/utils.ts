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
import { hash } from '@liskhq/lisk-cryptography';
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

/* tslint:disable no-magic-numbers */
export const getGroup = (
	address: string,
	groupNumber: number,
): number | undefined => {
	if (groupNumber > 3) {
		return undefined;
	}

	const group = parseInt(address.split('.')[groupNumber], 10);

	if (!Number.isInteger(group)) {
		return undefined;
	}

	return group;
};

interface AddressBytes {
	readonly aBytes: Buffer;
	readonly bBytes: Buffer;
	readonly cBytes: Buffer;
	readonly dBytes: Buffer;
}

export const getAddressBytes = (address: string): AddressBytes => {
	const aBytes = Buffer.alloc(PREFIX_BUFFER_LENGTH);
	aBytes.writeUInt8(getGroup(address, 0) as number, 0);
	const bBytes = Buffer.alloc(PREFIX_BUFFER_LENGTH);
	bBytes.writeUInt8(getGroup(address, 1) as number, 0);
	const cBytes = Buffer.alloc(PREFIX_BUFFER_LENGTH);
	cBytes.writeUInt8(getGroup(address, 2) as number, 0);
	const dBytes = Buffer.alloc(PREFIX_BUFFER_LENGTH);
	dBytes.writeUInt8(getGroup(address, 3) as number, 0);

	return {
		aBytes,
		bBytes,
		cBytes,
		dBytes,
	};
};

export const isPrivate = (address: string) =>
	getGroup(address, 0) === 10 ||
	(getGroup(address, 0) === 172 &&
		((getGroup(address, 1) as number) >= 16 ||
			(getGroup(address, 1) as number) <= 31));

export const isLocal = (address: string) =>
	getGroup(address, 0) === 127 || getGroup(address, 0) === 0;
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

interface GroupBytes {
	readonly secretBytes: Buffer;
	readonly networkBytes: Buffer;
	readonly targetABytes: Buffer;
	readonly targetBBytes: Buffer;
	readonly targetCBytes: Buffer;
	readonly targetDBytes: Buffer;
	readonly sourceABytes?: Buffer;
	readonly sourceBBytes?: Buffer;
}

export const getGroupBytes = (options: {
	readonly secret: number;
	readonly targetAddress: string;
	readonly sourceAddress?: string;
}): GroupBytes => {
	const { secret, targetAddress, sourceAddress } = options;
	const peerListType = sourceAddress ? NEW_PEERS : TRIED_PEERS;
	const secretBytes = Buffer.alloc(SECRET_BUFFER_LENGTH);
	secretBytes.writeUInt32BE(secret, 0);
	const network = getNetwork(targetAddress);
	const networkBytes = Buffer.alloc(NETWORK_BUFFER_LENGTH);
	networkBytes.writeUInt8(network, 0);

	// Full bytes of ip address to bucket
	const {
		aBytes: targetABytes,
		bBytes: targetBBytes,
		cBytes: targetCBytes,
		dBytes: targetDBytes,
	} = getAddressBytes(targetAddress);

	// No need to return source ip address bytes for tried peers bucket
	if (peerListType === TRIED_PEERS) {
		return {
			secretBytes,
			networkBytes,
			targetABytes,
			targetBBytes,
			targetCBytes,
			targetDBytes,
		};
	}

	// Prefix bytes of peer's ip address from which peer list was received
	const { aBytes: sourceABytes, bBytes: sourceBBytes } = getAddressBytes(
		sourceAddress as string,
	);

	return {
		secretBytes,
		networkBytes,
		targetABytes,
		targetBBytes,
		targetCBytes,
		targetDBytes,
		sourceABytes,
		sourceBBytes,
	};
};

export const getNetgroup = (
	address: string,
	secret: number,
): number | undefined => {
	if (!isIPv4(address)) {
		return undefined;
	}

	const {
		secretBytes,
		networkBytes,
		targetABytes,
		targetBBytes,
	} = getGroupBytes({ secret, targetAddress: address });

	// Check if ip address is unsupported network type
	if (getNetwork(address) === NETWORK.NET_OTHER) {
		return undefined;
	}

	// Seperate buckets for local and private addresses
	if (getNetwork(address) !== NETWORK.NET_IPV4) {
		return hash(Buffer.concat([secretBytes, networkBytes])).readUInt32BE(0);
	}

	const netgroupBytes = Buffer.concat([
		secretBytes,
		networkBytes,
		targetABytes,
		targetBBytes,
	]);

	return hash(netgroupBytes).readUInt32BE(0);
};

// For new peer buckets, provide the source IP address from which the peer list was received
export const getBucket = (options: {
	readonly secret: number;
	readonly targetAddress: string;
	readonly sourceAddress?: string;
}): number | undefined => {
	const { secret, targetAddress, sourceAddress } = options;
	const peerListType = sourceAddress ? NEW_PEERS : TRIED_PEERS;
	const firstMod = peerListType === NEW_PEERS ? BYTES_16 : BYTES_4;
	const secondMod = peerListType === NEW_PEERS ? BYTES_128 : BYTES_64;

	if (!isIPv4(targetAddress) || (sourceAddress && !isIPv4(sourceAddress))) {
		return undefined;
	}

	const {
		secretBytes,
		networkBytes,
		targetABytes,
		targetBBytes,
		targetCBytes,
		targetDBytes,
		sourceABytes = Buffer.alloc(0),
		sourceBBytes = Buffer.alloc(0),
	} = getGroupBytes({ secret, targetAddress, sourceAddress });

	// Check if ip address is unsupported network type
	if (getNetwork(targetAddress) === NETWORK.NET_OTHER) {
		return undefined;
	}

	// Seperate buckets for local and private addresses
	if (getNetwork(targetAddress) !== NETWORK.NET_IPV4) {
		return (
			hash(Buffer.concat([secretBytes, networkBytes])).readUInt32BE(0) %
			secondMod
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
			? hash(
					Buffer.concat([
						secretBytes,
						networkBytes,
						sourceABytes,
						sourceBBytes,
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

	return hash(bucketBytes).readUInt32BE(0) % secondMod;
};
