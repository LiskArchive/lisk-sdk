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
import validator from 'validator';

import {
	INCOMPATIBLE_NETWORK_REASON,
	INCOMPATIBLE_PROTOCOL_VERSION_REASON,
	INVALID_PEER_INFO_LIST_REASON,
	PEER_INFO_LIST_TOO_LONG_REASON,
} from '../constants';
// eslint-disable-next-line import/no-cycle
import {
	InvalidNodeInfoError,
	InvalidPeerInfoError,
	InvalidPeerInfoListError,
	InvalidProtocolMessageError,
	InvalidRPCRequestError,
} from '../errors';
// eslint-disable-next-line import/no-cycle
import {
	P2PCompatibilityCheckReturnType,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PRequestPacket,
} from '../types';

// eslint-disable-next-line import/no-cycle
import { getByteSize, sanitizeIncomingPeerInfo } from '.';

interface RPCPeerListResponse {
	readonly peers: ReadonlyArray<object>;
	readonly success?: boolean; // Could be used in future
}

const IPV4_NUMBER = '4';
const IPV6_NUMBER = '6';

const validateNetworkCompatibility = (
	peerInfo: P2PPeerInfo,
	nodeInfo: P2PNodeInfo,
): boolean => {
	if (!peerInfo.sharedState) {
		return false;
	}

	if (!peerInfo.sharedState.networkId) {
		return false;
	}

	return peerInfo.sharedState.networkId === nodeInfo.networkId;
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

	const peerHardForks = parseInt(
		peerInfo.sharedState.networkVersion.split('.')[0],
		10,
	);
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

export const validatePeerAddress = (
	ipAddress: string,
	port: number,
): boolean => {
	if (
		(!validator.isIP(ipAddress, IPV4_NUMBER) &&
			!validator.isIP(ipAddress, IPV6_NUMBER)) ||
		!validator.isPort(port.toString())
	) {
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

export const validateNodeInfo = (
	nodeInfo: Buffer,
	maxByteSize: number,
): void => {
	const byteSize = getByteSize(nodeInfo);

	if (byteSize > maxByteSize) {
		throw new InvalidNodeInfoError(
			`Invalid NodeInfo was larger than the maximum allowed ${maxByteSize} bytes`,
		);
	}
};

export const validatePeerInfoList = (
	rawBasicPeerInfoList: unknown,
	maxPeerInfoListLength: number,
	maxPeerInfoByteSize: number,
): ReadonlyArray<P2PPeerInfo> => {
	if (!rawBasicPeerInfoList) {
		throw new InvalidPeerInfoListError(INVALID_PEER_INFO_LIST_REASON);
	}
	const { peers } = rawBasicPeerInfoList as RPCPeerListResponse;

	if (Array.isArray(peers)) {
		if (peers.length === 0) {
			return [];
		}
		if (peers.length > maxPeerInfoListLength) {
			throw new InvalidPeerInfoListError(PEER_INFO_LIST_TOO_LONG_REASON);
		}

		const sanitizedPeerList = peers.map<P2PPeerInfo>(peerInfo =>
			validatePeerInfo(sanitizeIncomingPeerInfo(peerInfo), maxPeerInfoByteSize),
		);

		return sanitizedPeerList;
	}
	throw new InvalidPeerInfoListError(INVALID_PEER_INFO_LIST_REASON);
};

export const validateRPCRequest = (request: unknown): P2PRequestPacket => {
	if (!request) {
		throw new InvalidRPCRequestError('Invalid request');
	}

	const rpcRequest = request as P2PRequestPacket;
	if (typeof rpcRequest.procedure !== 'string') {
		throw new InvalidRPCRequestError('Request procedure name is not a string');
	}

	return rpcRequest;
};

export const validateProtocolMessage = (message: unknown): P2PMessagePacket => {
	if (!message) {
		throw new InvalidProtocolMessageError('Invalid message');
	}

	const protocolMessage = message as P2PMessagePacket;
	if (typeof protocolMessage.event !== 'string') {
		throw new InvalidProtocolMessageError('Protocol message is not a string');
	}

	return protocolMessage;
};
