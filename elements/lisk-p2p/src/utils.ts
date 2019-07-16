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
const MOD_4 = 4;
const MOD_64 = 64;

export enum NETWORK {
	NET_IPV4 = 0,
	NET_PRIVATE,
	NET_LOCAL,
	NET_OTHER,
}

/* tslint:disable no-magic-numbers */
export const getByte = (address: string, n: number): number | undefined => {
	if (n > 3) {
		return undefined;
	}

	return parseInt(address.split('.')[n], 10);
};

export const isPrivate = (address: string) => getByte(address, 0) === 10;

export const isLocal = (address: string) =>
	getByte(address, 0) === 127 || getByte(address, 0) === 0;
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

interface HashBytes {
	readonly networkBytes: Buffer;
	readonly secretBytes: Buffer;
	readonly groupABytes: Buffer;
	readonly groupBBytes: Buffer;
}

export const getBytes = (address: string, secret: number): HashBytes => {
	const network = getNetwork(address);
	const networkBytes = Buffer.alloc(NETWORK_BUFFER_LENGTH);
	networkBytes.writeUInt8(network, 0);
	const secretBytes = Buffer.alloc(SECRET_BUFFER_LENGTH);
	secretBytes.writeUInt32BE(secret, 0);
	const groupABytes = Buffer.alloc(PREFIX_BUFFER_LENGTH);
	const groupA = getByte(address, 0) || 0;
	groupABytes.writeUInt8(groupA, 0);
	const groupBBytes = Buffer.alloc(PREFIX_BUFFER_LENGTH);
	const groupB = getByte(address, 1) || 0;
	groupBBytes.writeUInt8(groupB, 0);

	return {
		secretBytes,
		networkBytes,
		groupABytes,
		groupBBytes,
	};
};

// TODO: Generate random 32-bit entropy secret upon node start-up in framework layer
export const getNetgroup = (
	address: string,
	secret: number,
): number | undefined => {
	if (!isIPv4(address)) {
		return undefined;
	}

	const { networkBytes, secretBytes, groupABytes, groupBBytes } = getBytes(
		address,
		secret,
	);

	if (getNetwork(address) !== NETWORK.NET_IPV4) {
		return hash(networkBytes).readUInt32BE(0);
	}

	const netgroupBytes = Buffer.concat([
		secretBytes,
		networkBytes,
		groupABytes,
		groupBBytes,
	]);

	return hash(netgroupBytes).readUInt32BE(0);
};

export const getBucket = (
	address: string,
	secret: number,
): number | undefined => {
	if (!isIPv4(address)) {
		return undefined;
	}
	const { networkBytes, secretBytes, groupABytes, groupBBytes } = getBytes(
		address,
		secret,
	);

	if (getNetwork(address) !== NETWORK.NET_IPV4) {
		return hash(networkBytes).readUInt32BE(0) % MOD_64;
	}
	const addressBytes = Buffer.from(address, 'utf8');
	const k =
		hash(Buffer.concat([secretBytes, addressBytes])).readUInt32BE(0) % MOD_4;
	const kBytes = Buffer.alloc(SECRET_BUFFER_LENGTH);
	kBytes.writeUInt32BE(k, 0);
	const bucketBytes = Buffer.concat([
		networkBytes,
		groupABytes,
		groupBBytes,
		kBytes,
	]);

	return hash(bucketBytes).readUInt32BE(0) % MOD_64;
};
