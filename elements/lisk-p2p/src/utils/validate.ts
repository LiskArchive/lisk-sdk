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
import { isIP, isPort } from 'validator';
import { getByteSize, sanitizeIncomingPeerInfo } from '.';
import {
	INCOMPATIBLE_NETWORK_REASON,
	INCOMPATIBLE_PROTOCOL_VERSION_REASON,
	INVALID_PEER_INFO_LIST_REASON,
	PEER_INFO_LIST_TOO_LONG_REASON,
} from '../constants';
import {
	InvalidNodeInfoError,
	InvalidPeerInfoError,
	InvalidPeerInfoListError,
	InvalidProtocolMessageError,
	InvalidRPCRequestError,
} from '../errors';
import {
	P2PCompatibilityCheckReturnType,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PRequestPacket,
	ProtocolPeerInfo,
} from '../p2p_types';

interface RPCPeerListResponse {
	readonly peers: ReadonlyArray<object>;
	readonly success?: boolean; // Could be used in future
}

const IPV4_NUMBER = 4;
const IPV6_NUMBER = 6;

const validateNetworkCompatibility = (
	peerInfo: P2PPeerInfo,
	nodeInfo: P2PNodeInfo,
): boolean => {
	if (!peerInfo.sharedState) {
		return false;
	}

	if (!peerInfo.sharedState.nethash) {
		return false;
	}

	return peerInfo.sharedState.nethash === nodeInfo.nethash;
};

const validateProtocolVersionCompatibility = (
	peerInfo: P2PPeerInfo,
	nodeInfo: P2PNodeInfo,
): boolean => {
	if (!peerInfo.sharedState) {
		return false;
	}

	if (typeof peerInfo.sharedState.protocolVersion !== 'string') {
		return false;
	}

	const peerHardForks = parseInt(
		peerInfo.sharedState.protocolVersion.split('.')[0],
		10,
	);
	const systemHardForks = parseInt(nodeInfo.protocolVersion.split('.')[0], 10);

	return systemHardForks === peerHardForks && peerHardForks >= 1;
};

export const validatePeerCompatibility = (
	peerInfo: P2PPeerInfo,
	nodeInfo: P2PNodeInfo,
): P2PCompatibilityCheckReturnType => {
	if (!validateNetworkCompatibility(peerInfo, nodeInfo)) {
		return {
			success: false,
			errors: [INCOMPATIBLE_NETWORK_REASON],
		};
	}

	if (!validateProtocolVersionCompatibility(peerInfo, nodeInfo)) {
		return {
			success: false,
			errors: [INCOMPATIBLE_PROTOCOL_VERSION_REASON],
		};
	}

	return {
		success: true,
	};
};

export const validatePeerAddress = (
	ipAddress: string,
	wsPort: number,
): boolean => {
	if (
		(!isIP(ipAddress, IPV4_NUMBER) && !isIP(ipAddress, IPV6_NUMBER)) ||
		!isPort(wsPort.toString())
	) {
		return false;
	}

	return true;
};

export const validatePeerInfo = (
	rawPeerInfo: unknown,
	maxByteSize: number,
): P2PPeerInfo => {
	if (!rawPeerInfo) {
		throw new InvalidPeerInfoError(`Invalid peer object`);
	}

	const protocolPeer = rawPeerInfo as ProtocolPeerInfo;

	if (
		!protocolPeer.ipAddress ||
		!protocolPeer.wsPort ||
		!validatePeerAddress(protocolPeer.ipAddress, protocolPeer.wsPort)
	) {
		throw new InvalidPeerInfoError(
			`Invalid peer ipAddress or port for peer with ip: ${
				protocolPeer.ipAddress
			} and wsPort ${protocolPeer.wsPort}`,
		);
	}

	const peerInfo = sanitizeIncomingPeerInfo(protocolPeer);

	const byteSize = getByteSize(peerInfo);
	if (byteSize > maxByteSize) {
		throw new InvalidPeerInfoError(
			`PeerInfo is larger than the maximum allowed size ${maxByteSize} bytes`,
		);
	}

	return peerInfo;
};

export const validateNodeInfo = (
	nodeInfo: P2PNodeInfo,
	maxByteSize: number,
): void => {
	const byteSize = getByteSize(nodeInfo);

	if (byteSize > maxByteSize) {
		throw new InvalidNodeInfoError(
			`Invalid NodeInfo was larger than the maximum allowed ${maxByteSize} bytes`,
		);
	}

	return;
};

export const validatePeersInfoList = (
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
			validatePeerInfo(peerInfo, maxPeerInfoByteSize),
		);

		return sanitizedPeerList;
	} else {
		throw new InvalidPeerInfoListError(INVALID_PEER_INFO_LIST_REASON);
	}
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
