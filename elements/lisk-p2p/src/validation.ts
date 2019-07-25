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
import { gte as isVersionGTE, valid as isValidVersion } from 'semver';
import { isIP, isNumeric, isPort } from 'validator';
import {
	InvalidPeerError,
	InvalidProtocolMessageError,
	InvalidRPCRequestError,
	InvalidRPCResponseError,
} from './errors';

import {
	INCOMPATIBLE_NETWORK_REASON,
	INCOMPATIBLE_PROTOCOL_VERSION_REASON,
} from './disconnect_status_codes';
import {
	P2PCompatibilityCheckReturnType,
	P2PDiscoveredPeerInfo,
	P2PNodeInfo,
	P2PPeerInfo,
	PeerLists,
	ProtocolMessagePacket,
	ProtocolPeerInfo,
	ProtocolRPCRequestPacket,
} from './p2p_types';
import { constructPeerIdFromPeerInfo } from './peer';

const IPV4_NUMBER = 4;
const IPV6_NUMBER = 6;

interface RPCPeerListResponse {
	readonly peers: ReadonlyArray<object>;
	readonly success?: boolean; // Could be used in future
}

export const validatePeerAddress = (ip: string, wsPort: number): boolean => {
	if (
		(!isIP(ip, IPV4_NUMBER) && !isIP(ip, IPV6_NUMBER)) ||
		!isPort(wsPort.toString())
	) {
		return false;
	}

	return true;
};

export const validatePeerInfo = (rawPeerInfo: unknown): P2PPeerInfo => {
	if (!rawPeerInfo) {
		throw new InvalidPeerError(`Invalid peer object`);
	}

	const protocolPeer = rawPeerInfo as ProtocolPeerInfo;
	if (
		!protocolPeer.ip ||
		!protocolPeer.wsPort ||
		!validatePeerAddress(protocolPeer.ip, protocolPeer.wsPort)
	) {
		throw new InvalidPeerError(`Invalid peer ip or port`);
	}

	if (!protocolPeer.version || !isValidVersion(protocolPeer.version)) {
		throw new InvalidPeerError(`Invalid peer version`);
	}

	const version = protocolPeer.version;
	const protocolVersion = protocolPeer.protocolVersion;
	const wsPort = +protocolPeer.wsPort;
	const os = protocolPeer.os ? protocolPeer.os : '';
	const height =
		protocolPeer.height && isNumeric(protocolPeer.height.toString())
			? +protocolPeer.height
			: 0;
	const { options, ...protocolPeerWithoutOptions } = protocolPeer;
	const peerInfo: P2PPeerInfo = {
		...protocolPeerWithoutOptions,
		ipAddress: protocolPeerWithoutOptions.ip,
		wsPort,
		height,
		os,
		version,
		protocolVersion,
	};

	const { ip, ...peerInfoUpdated } = peerInfo;

	return peerInfoUpdated;
};

export const validatePeerInfoList = (
	rawPeerInfoList: unknown,
): ReadonlyArray<P2PPeerInfo> => {
	if (!rawPeerInfoList) {
		throw new InvalidRPCResponseError('Invalid response type');
	}
	const { peers } = rawPeerInfoList as RPCPeerListResponse;

	if (Array.isArray(peers)) {
		const peerList = peers.map<P2PPeerInfo>(validatePeerInfo);

		return peerList;
	} else {
		throw new InvalidRPCResponseError('Invalid response type');
	}
};

export const validateRPCRequest = (
	request: unknown,
): ProtocolRPCRequestPacket => {
	if (!request) {
		throw new InvalidRPCRequestError('Invalid request');
	}

	const rpcRequest = request as ProtocolRPCRequestPacket;
	if (typeof rpcRequest.procedure !== 'string') {
		throw new InvalidRPCRequestError('Request procedure name is not a string');
	}

	return rpcRequest;
};

export const validateProtocolMessage = (
	message: unknown,
): ProtocolMessagePacket => {
	if (!message) {
		throw new InvalidProtocolMessageError('Invalid message');
	}

	const protocolMessage = message as ProtocolMessagePacket;
	if (typeof protocolMessage.event !== 'string') {
		throw new InvalidProtocolMessageError('Protocol message is not a string');
	}

	return protocolMessage;
};

export const checkNetworkCompatibility = (
	peerInfo: P2PDiscoveredPeerInfo,
	nodeInfo: P2PNodeInfo,
): boolean => {
	if (!peerInfo.nethash) {
		return false;
	}

	return peerInfo.nethash === nodeInfo.nethash;
};

export const checkProtocolVersionCompatibility = (
	peerInfo: P2PDiscoveredPeerInfo,
	nodeInfo: P2PNodeInfo,
): boolean => {
	// Backwards compatibility for older peers which do not have a protocolVersion field.
	if (!peerInfo.protocolVersion) {
		try {
			return isVersionGTE(peerInfo.version, nodeInfo.minVersion as string);
		} catch (error) {
			return false;
		}
	}
	if (typeof peerInfo.protocolVersion !== 'string') {
		return false;
	}

	const peerHardForks = parseInt(peerInfo.protocolVersion.split('.')[0], 10);
	const systemHardForks = parseInt(nodeInfo.protocolVersion.split('.')[0], 10);

	return systemHardForks === peerHardForks && peerHardForks >= 1;
};

export const checkPeerCompatibility = (
	peerInfo: P2PDiscoveredPeerInfo,
	nodeInfo: P2PNodeInfo,
): P2PCompatibilityCheckReturnType => {
	if (!checkNetworkCompatibility(peerInfo, nodeInfo)) {
		return {
			success: false,
			errors: [INCOMPATIBLE_NETWORK_REASON],
		};
	}

	if (!checkProtocolVersionCompatibility(peerInfo, nodeInfo)) {
		return {
			success: false,
			errors: [INCOMPATIBLE_PROTOCOL_VERSION_REASON],
		};
	}

	return {
		success: true,
	};
};

export const sanitizePeerLists = (
	lists: PeerLists,
	nodeInfo: P2PPeerInfo,
): PeerLists => {
	const blacklistedPeers = lists.blacklistedPeers.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		return true;
	});

	const blacklistedIPs = blacklistedPeers.map(peerInfo => peerInfo.ipAddress);

	const seedPeers = lists.seedPeers.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.ipAddress)) {
			return false;
		}

		return true;
	});

	const fixedPeers = lists.fixedPeers.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.ipAddress)) {
			return false;
		}

		return true;
	});

	const whitelisted = lists.whitelisted.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.ipAddress)) {
			return false;
		}

		if (
			fixedPeers
				.map(constructPeerIdFromPeerInfo)
				.includes(constructPeerIdFromPeerInfo(peerInfo))
		) {
			return false;
		}

		if (
			seedPeers
				.map(constructPeerIdFromPeerInfo)
				.includes(constructPeerIdFromPeerInfo(peerInfo))
		) {
			return false;
		}

		return true;
	});

	const previousPeers = lists.previousPeers.filter(peerInfo => {
		if (peerInfo.ipAddress === nodeInfo.ipAddress) {
			return false;
		}

		if (blacklistedIPs.includes(peerInfo.ipAddress)) {
			return false;
		}

		return true;
	});

	return {
		blacklistedPeers,
		seedPeers,
		fixedPeers,
		whitelisted,
		previousPeers,
	};
};
