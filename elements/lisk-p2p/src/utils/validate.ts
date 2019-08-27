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
import { gte as isVersionGTE, valid as isValidVersion } from 'semver';
import { isIP, isNumeric, isPort } from 'validator';
import {
	INCOMPATIBLE_NETWORK_REASON,
	INCOMPATIBLE_PROTOCOL_VERSION_REASON,
} from '../constants';
import {
	InvalidPeerException,
	InvalidProtocolMessageException,
	InvalidRPCRequestException,
	InvalidRPCResponseException,
} from '../exceptions';
import {
	P2PCompatibilityCheckReturnType,
	P2PDiscoveredPeerInfo,
	P2PNodeInfo,
	P2PPeerInfo,
	ProtocolMessagePacket,
	ProtocolPeerInfo,
	ProtocolRPCRequestPacket,
} from '../p2p_types';

interface RPCPeerListResponse {
	readonly peers: ReadonlyArray<object>;
	readonly success?: boolean; // Could be used in future
}

const IPV4_NUMBER = 4;
const IPV6_NUMBER = 6;

const validateNetworkCompatibility = (
	peerInfo: P2PDiscoveredPeerInfo,
	nodeInfo: P2PNodeInfo,
): boolean => {
	if (!peerInfo.nethash) {
		return false;
	}

	return peerInfo.nethash === nodeInfo.nethash;
};

const validateProtocolVersionCompatibility = (
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

export const validatePeerCompatibility = (
	peerInfo: P2PDiscoveredPeerInfo,
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

export const getByteSize = (object: any): number =>
	Buffer.byteLength(JSON.stringify(object));

export const validatePeerAddress = (ip: string, wsPort: number): boolean => {
	if (
		(!isIP(ip, IPV4_NUMBER) && !isIP(ip, IPV6_NUMBER)) ||
		!isPort(wsPort.toString())
	) {
		return false;
	}

	return true;
};

export const validatePeerInfoSchema = (rawPeerInfo: unknown): P2PPeerInfo => {
	if (!rawPeerInfo) {
		throw new InvalidPeerException(`Invalid peer object`);
	}

	const protocolPeer = rawPeerInfo as ProtocolPeerInfo;
	if (
		!protocolPeer.ip ||
		!protocolPeer.wsPort ||
		!validatePeerAddress(protocolPeer.ip, protocolPeer.wsPort)
	) {
		throw new InvalidPeerException(`Invalid peer ip or port`);
	}

	if (!protocolPeer.version || !isValidVersion(protocolPeer.version)) {
		throw new InvalidPeerException(`Invalid peer version`);
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

export const validatePeerInfo = (
	rawPeerInfo: unknown,
	maxByteSize: number,
): P2PPeerInfo => {
	const byteSize = getByteSize(rawPeerInfo);
	if (byteSize > maxByteSize) {
		throw new InvalidRPCResponseException(
			`PeerInfo was larger than the maximum allowed ${maxByteSize} bytes`,
		);
	}

	return validatePeerInfoSchema(rawPeerInfo);
};

export const validatePeersInfoList = (
	rawBasicPeerInfoList: unknown,
	maxPeerInfoListLength: number,
	maxPeerInfoByteSize: number,
): ReadonlyArray<P2PPeerInfo> => {
	if (!rawBasicPeerInfoList) {
		throw new InvalidRPCResponseException('Invalid response type');
	}
	const { peers } = rawBasicPeerInfoList as RPCPeerListResponse;

	if (Array.isArray(peers)) {
		if (peers.length > maxPeerInfoListLength) {
			throw new InvalidRPCResponseException('PeerInfo list was too long');
		}
		const cleanPeerList = peers.filter(
			peerInfo => getByteSize(peerInfo) < maxPeerInfoByteSize,
		);
		const sanitizedPeerList = cleanPeerList.map<P2PPeerInfo>(
			validatePeerInfoSchema,
		);

		return sanitizedPeerList;
	} else {
		throw new InvalidRPCResponseException('Invalid response type');
	}
};

export const validateRPCRequest = (
	request: unknown,
): ProtocolRPCRequestPacket => {
	if (!request) {
		throw new InvalidRPCRequestException('Invalid request');
	}

	const rpcRequest = request as ProtocolRPCRequestPacket;
	if (typeof rpcRequest.procedure !== 'string') {
		throw new InvalidRPCRequestException(
			'Request procedure name is not a string',
		);
	}

	return rpcRequest;
};

export const validateProtocolMessage = (
	message: unknown,
): ProtocolMessagePacket => {
	if (!message) {
		throw new InvalidProtocolMessageException('Invalid message');
	}

	const protocolMessage = message as ProtocolMessagePacket;
	if (typeof protocolMessage.event !== 'string') {
		throw new InvalidProtocolMessageException(
			'Protocol message is not a string',
		);
	}

	return protocolMessage;
};
