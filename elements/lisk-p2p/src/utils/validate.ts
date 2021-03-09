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
import { codec, Schema } from '@liskhq/lisk-codec';
import { isIP, isPort, validator } from '@liskhq/lisk-validator';
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
	readonly peers: ReadonlyArray<Buffer>;
}

const validateNetworkCompatibility = (peerInfo: P2PPeerInfo, nodeInfo: P2PNodeInfo): boolean => {
	if (!peerInfo.sharedState) {
		return false;
	}

	if (!peerInfo.sharedState.networkIdentifier) {
		return false;
	}

	return peerInfo.sharedState.networkIdentifier === nodeInfo.networkIdentifier;
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
	if (!isIP(ipAddress) || !isPort(port.toString())) {
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
	if (nodeInfo) {
		return;
	}

	if (nodeInfo && getByteSize(nodeInfo) > maxByteSize) {
		throw new InvalidNodeInfoError(
			`Invalid NodeInfo was larger than the maximum allowed ${maxByteSize} bytes`,
		);
	}
};

export const validatePeerInfoList = (
	rawBasicPeerInfoList: unknown,
	maxPeerInfoListLength: number,
	maxPeerInfoByteSize: number,
	peerInfoSchema: Schema,
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

		const sanitizedPeerList = peers.map<P2PPeerInfo>((peerInfoBuffer: Buffer) => {
			const peerInfo = codec.decode<P2PPeerInfo>(peerInfoSchema, peerInfoBuffer);
			validatePeerInfo(sanitizeIncomingPeerInfo(peerInfo), maxPeerInfoByteSize);
			return peerInfo;
		});

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

	if (rpcRequest.data !== undefined && typeof rpcRequest.data !== 'string') {
		throw new InvalidRPCRequestError('Request data is not a string or undefined');
	}

	return rpcRequest;
};

export const validateProtocolMessage = (message: P2PMessagePacket): void => {
	if (!message) {
		throw new InvalidProtocolMessageError('Invalid message');
	}

	if (typeof message.event !== 'string') {
		throw new InvalidProtocolMessageError('Protocol message is not a string');
	}

	if (typeof message.data !== 'string' && message.data !== undefined) {
		throw new InvalidProtocolMessageError('Protocol message data is not a string or undefined');
	}
};

const packetSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		event: {
			type: 'string',
		},
		procedure: {
			type: 'string',
		},
		cid: {
			type: 'integer',
		},
		rid: {
			type: 'integer',
		},
		data: {
			type: ['object', 'string'],
		},
	},
};

export const validatePacket = (packet: unknown): void => {
	const errors = validator.validate(packetSchema, packet as P2PMessagePacket | P2PRequestPacket);

	if (errors.length) {
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
