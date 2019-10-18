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
import { ConnectionKind, PeerKind } from './constants';
export interface P2PPacket {
	readonly data?: unknown;
}

export interface P2PRequestPacket extends P2PPacket {
	readonly data?: unknown;
	readonly procedure: string;
}

export interface P2PResponsePacket extends P2PPacket {
	readonly data: unknown;
}

export interface P2PMessagePacket extends P2PPacket {
	readonly data?: unknown;
	readonly event: string;
}

export interface P2PPenalty {
	readonly peerId: string;
	readonly penalty: number;
}

export interface P2PSharedState {
	readonly version: string;
	readonly protocolVersion: string;
	// tslint:disable-next-line: no-mixed-interface
	readonly [key: string]: unknown;
}

export interface P2PInternalState {
	readonly dateAdded?: Date;
	readonly peerKind?: PeerKind;
	readonly isBanned?: boolean;
	readonly productivity?: number;
	readonly reputation?: number;
	readonly connectionKind?: ConnectionKind;
}

export interface P2PPeerInfo {
	// String to uniquely identify each peer
	readonly peerId: string;
	readonly ipAddress: string;
	readonly wsPort: number;
	readonly sharedState?: P2PSharedState;
	readonly internalState?: P2PInternalState;
}

export interface P2PPeersCount {
	readonly outboundCount: number;
	readonly inboundCount: number;
}

// P2PPeerInfo and P2PNodeInfo are related.
// P2PNodeInfo is the outbound info from our node.
export interface P2PNodeInfo extends P2PSharedState {
	readonly os: string;
	readonly nethash: string;
	readonly wsPort: number;
}

// This is a representation of the inbound peer object according to the current protocol.
// TODO later: Switch to LIP protocol format.
// TODO: Include peerId as field
export interface ProtocolPeerInfo {
	// To support the existing protocol
	readonly ip?: string;
	readonly ipAddress: string;
	readonly wsPort: number;
	readonly broadhash?: string;
	readonly height?: number;
	readonly nonce?: string;
	readonly os?: string;
	readonly version?: string;
	readonly protocolVersion?: string;
	readonly httpPort?: number;
	// tslint:disable-next-line: no-mixed-interface
	readonly [key: string]: unknown;
}

// TODO later: Switch to LIP protocol format.
// This is a representation of the outbound peer object according to the current protocol.
export interface ProtocolNodeInfo extends P2PSharedState {
	readonly broadhash: string;
	readonly nethash: string;
	readonly nonce: string;
	readonly wsPort: number;
	readonly httpPort: number;
}
export interface P2PClosePacket {
	readonly peerInfo: P2PPeerInfo;
	readonly code: number;
	readonly reason?: string;
}

export interface PeerLists {
	readonly blacklist: ReadonlyArray<P2PPeerInfo>;
	readonly seeds: ReadonlyArray<P2PPeerInfo>;
	readonly fixedPeers: ReadonlyArray<P2PPeerInfo>;
	readonly whitelistedPeers: ReadonlyArray<P2PPeerInfo>;
	readonly previousPeers: ReadonlyArray<P2PPeerInfo>;
}

export interface P2PConfig {
	readonly peerLists: PeerLists;
	readonly connectTimeout?: number;
	readonly ackTimeout?: number;
	readonly hostAddress?: string;
	readonly nodeInfo: P2PNodeInfo;
	readonly wsEngine?: string;
	readonly populatorInterval?: number;
	readonly maxOutboundConnections: number;
	readonly maxInboundConnections: number;
	readonly wsMaxPayload?: number;
	readonly peerSelectionForSend?: P2PPeerSelectionForSendFunction;
	readonly peerSelectionForRequest?: P2PPeerSelectionForRequestFunction;
	readonly peerSelectionForConnection?: P2PPeerSelectionForConnectionFunction;
	readonly peerHandshakeCheck?: P2PCheckPeerCompatibility;
	readonly peerBanTime?: number;
	readonly sendPeerLimit?: number;
	readonly outboundShuffleInterval?: number;
	readonly latencyProtectionRatio?: number;
	readonly productivityProtectionRatio?: number;
	readonly longevityProtectionRatio?: number;
	readonly netgroupProtectionRatio?: number;
	readonly hostIp?: string;
	readonly wsMaxMessageRate?: number;
	readonly wsMaxMessageRatePenalty?: number;
	readonly rateCalculationInterval?: number;
	readonly minimumPeerDiscoveryThreshold?: number;
	readonly peerDiscoveryResponseLength?: number;
	readonly maxPeerDiscoveryResponseLength?: number;
	readonly maxPeerInfoSize?: number;
	readonly secret?: number;
}

export interface P2PPeerSelectionForSendInput {
	readonly peers: ReadonlyArray<P2PPeerInfo>;
	readonly nodeInfo?: P2PNodeInfo;
	readonly peerLimit?: number;
	readonly messagePacket?: P2PMessagePacket;
}

export type P2PPeerSelectionForSendFunction = (
	input: P2PPeerSelectionForSendInput,
) => ReadonlyArray<P2PPeerInfo>;

export interface P2PPeerSelectionForRequestInput {
	readonly peers: ReadonlyArray<P2PPeerInfo>;
	readonly nodeInfo?: P2PNodeInfo;
	readonly peerLimit?: number;
	readonly requestPacket?: P2PRequestPacket;
}

export type P2PPeerSelectionForRequestFunction = (
	input: P2PPeerSelectionForRequestInput,
) => ReadonlyArray<P2PPeerInfo>;

export interface P2PPeerSelectionForConnectionInput {
	readonly newPeers: ReadonlyArray<P2PPeerInfo>;
	readonly triedPeers: ReadonlyArray<P2PPeerInfo>;
	readonly nodeInfo?: P2PNodeInfo;
	readonly peerLimit?: number;
}

export type P2PPeerSelectionForConnectionFunction = (
	input: P2PPeerSelectionForConnectionInput,
) => ReadonlyArray<P2PPeerInfo>;

export interface P2PCompatibilityCheckReturnType {
	readonly success: boolean;
	readonly errors?: string[];
}

export type P2PCheckPeerCompatibility = (
	headers: P2PPeerInfo,
	nodeInfo: P2PNodeInfo,
) => P2PCompatibilityCheckReturnType;

// This is a representation of the peer list according to the current protocol.
// TODO later: Switch to LIP protocol format.
export interface ProtocolPeerInfoList {
	readonly peers: ReadonlyArray<ProtocolPeerInfo>;
	readonly success: boolean;
}

export interface P2PBasicPeerInfoList {
	readonly peers: ReadonlyArray<P2PPeerInfo>;
	readonly success: boolean;
}

// TODO later: Switch to LIP protocol format.
export interface ProtocolRPCRequestPacket {
	readonly data: unknown;
	readonly procedure: string;
	readonly type: string;
}

// TODO later: Switch to LIP protocol format.
export interface ProtocolMessagePacket {
	readonly data: unknown;
	readonly event: string;
}
