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
import { isIPV4, isPort, validator } from '@liskhq/lisk-validator';
import {
	INCOMPATIBLE_NETWORK_REASON,
	INCOMPATIBLE_PROTOCOL_VERSION_REASON,
	PEER_INFO_LIST_TOO_LONG_REASON,
} from '../constants';
// eslint-disable-next-line import/no-cycle
import { InvalidNodeInfoError, InvalidPeerInfoError, InvalidPeerInfoListError } from '../errors';
// eslint-disable-next-line import/no-cycle
import {
	P2PCompatibilityCheckReturnType,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PRequestPacket,
} from '../types';

// eslint-disable-next-line import/no-cycle
import { getByteSize } from '.';
import { packetSchema, rpcRequestSchema, protocolMessageSchema } from './schemas';

const validateNetworkCompatibility = (peerInfo: P2PPeerInfo, nodeInfo: P2PNodeInfo): boolean => {
	if (!peerInfo.sharedState) {
		return false;
	}

	if (!peerInfo.sharedState.chainID) {
		return false;
	}

	return peerInfo.sharedState.chainID.equals(nodeInfo.chainID);
};

const validateNetworkVersionCompatibility = (
	peerInfo: P2PPeerInfo,
	nodeInfo: P2PNodeInfo,
): boolean => {
	if (!peerInfo.sharedState) {
		return false;
	}

	if (typeof peerInfo.sharedState.networkVersion !== 'string') {
		return false;
	}

	const peerHardForks = parseInt(peerInfo.sharedState.networkVersion.split('.')[0], 10);
	const systemHardForks = parseInt(nodeInfo.networkVersion.split('.')[0], 10);

	return systemHardForks === peerHardForks && peerHardForks >= 1;
};

export const validatePeerCompatibility = (
	peerInfo: P2PPeerInfo,
	nodeInfo: P2PNodeInfo,
): P2PCompatibilityCheckReturnType => {
	if (!validateNetworkCompatibility(peerInfo, nodeInfo)) {
		return {
			success: false,
			error: INCOMPATIBLE_NETWORK_REASON,
		};
	}

	if (!validateNetworkVersionCompatibility(peerInfo, nodeInfo)) {
		return {
			success: false,
			error: INCOMPATIBLE_PROTOCOL_VERSION_REASON,
		};
	}

	return {
		success: true,
	};
};

export const validatePeerAddress = (ipAddress: string, port: number): boolean => {
	if (!isIPV4(ipAddress) || !isPort(port.toString())) {
		return false;
	}

	return true;
};

export const validatePeerInfo = (
	peerInfo: P2PPeerInfo | undefined,
	maxByteSize: number,
): P2PPeerInfo => {
	if (!peerInfo) {
		throw new InvalidPeerInfoError('Invalid peer object');
	}

	if (
		!peerInfo.ipAddress ||
		!peerInfo.port ||
		!validatePeerAddress(peerInfo.ipAddress, peerInfo.port)
	) {
		throw new InvalidPeerInfoError(
			`Invalid peer ipAddress or port for peer with ip: ${peerInfo.ipAddress} and port ${peerInfo.port}`,
		);
	}

	const byteSize = getByteSize(peerInfo);
	if (byteSize > maxByteSize) {
		throw new InvalidPeerInfoError(
			`PeerInfo is larger than the maximum allowed size ${maxByteSize} bytes`,
		);
	}

	return peerInfo;
};

export const validatePayloadSize = (nodeInfo: Buffer | undefined, maxByteSize: number): void => {
	if (nodeInfo === undefined) {
		return;
	}

	if (getByteSize(nodeInfo) > maxByteSize) {
		throw new InvalidNodeInfoError(
			`Invalid NodeInfo was larger than the maximum allowed ${maxByteSize} bytes`,
		);
	}
};

export const validatePeerInfoList = (
	peersList: ReadonlyArray<P2PPeerInfo>,
	maxPeerInfoListLength: number,
	maxPeerInfoByteSize: number,
): void => {
	if (peersList.length > maxPeerInfoListLength) {
		throw new InvalidPeerInfoListError(PEER_INFO_LIST_TOO_LONG_REASON);
	}
	peersList.map<P2PPeerInfo>(peerInfo => validatePeerInfo(peerInfo, maxPeerInfoByteSize));
};

export const validateRPCRequest = (request: unknown): void => {
	try {
		validator.validate(rpcRequestSchema, request as Record<string, unknown>);
	} catch {
		throw new Error('RPC request format is invalid.');
	}
};

export const validateProtocolMessage = (message: unknown): void => {
	try {
		validator.validate(protocolMessageSchema, message as Record<string, unknown>);
	} catch {
		throw new Error('Protocol message format is invalid.');
	}
};

export const validatePacket = (packet: unknown): void => {
	try {
		validator.validate(packetSchema, packet as P2PMessagePacket | P2PRequestPacket);
	} catch {
		throw new Error('Packet format is invalid.');
	}
};

export const isEmptyMessage = (data: unknown): boolean => {
	if (data === undefined || data === null) {
		return true;
	}

	if (
		typeof data === 'object' &&
		!Array.isArray(data) &&
		Object.keys(data as Record<string, unknown>).length === 0
	) {
		return true;
	}

	if (Array.isArray(data) && data.length === 0) {
		return true;
	}

	return false;
};
