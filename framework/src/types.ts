/*
 * Copyright © 2020 Lisk Foundation
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
 */
import { p2pTypes } from '@liskhq/lisk-p2p';

export interface StringKeyVal {
	[key: string]: string;
}

/* Start P2P */
export interface SeedPeerInfo {
	readonly ip: string;
	readonly wsPort: number;
}

export interface P2PRequestPeerPacket extends p2pTypes.P2PRequestPacket {
	readonly peerId: string;
}

export interface RPCBlocksByIdData {
	readonly blockId: string;
}

export interface EventPostBlockData {
	readonly block: string;
}

export interface EventPostTransactionData {
	readonly transaction: string;
}

export interface EventPostTransactionsAnnouncementData {
	readonly transactionIds: string[];
}

export interface RPCTransactionsByIdData {
	readonly transactionIds: string[];
}

export interface RPCHighestCommonBlockData {
	readonly ids: string[];
}
/* End P2P */

export interface ModuleOptions {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly [key: string]: any;
	readonly loadAsChildProcess: boolean;
}

export interface ModulesOptions {
	[key: string]: ModuleOptions;
}

export interface DelegateConfig {
	readonly publicKey: string;
	readonly encryptedPassphrase: string;
	readonly hashOnion: {
		readonly count: number;
		readonly distance: number;
		readonly hashes: string[];
	};
}

export interface NetworkConfig {
	wsPort: number;
	seedPeers: { ip: string; wsPort: number }[];
	hostIp?: string;
	blacklistedIPs?: string[];
	fixedPeers?: { ip: string; wsPort: number }[];
	whitelistedPeers?: { ip: string; wsPort: number }[];
	peerBanTime?: number;
	connectTimeout?: number;
	ackTimeout?: number;
	maxOutboundConnections?: number;
	maxInboundConnections?: number;
	sendPeerLimit?: number;
	maxPeerDiscoveryResponseLength?: number;
	maxPeerInfoSize?: number;
	wsMaxPayload?: number;
	advertiseAddress?: boolean;
	customSchema?: p2pTypes.RPCSchemas;
}

export interface GenesisConfig {
	epochTime: string;
	communityIdentifier: string;
	blockTime: number;
	maxPayloadLength: number;
	rewards: {
		milestones: string[];
		offset: number;
		distance: number;
	};
}

export interface ApplicationConstants {
	[key: string]: {} | string | number | undefined;
	activeDelegates: number;
	standbyDelegates: number;
	totalAmount: string;
	delegateListRoundOffset: number;
}

export interface ApplicationConfig {
	label: string;
	version: string;
	protocolVersion: string;
	networkId: string;
	lastCommitId: string;
	buildVersion: string;
	ipc: {
		enabled: boolean;
	};
	rootPath: string;
	forging: {
		waitThreshold: number;
		delegates: DelegateConfig[];
		force?: boolean;
		defaultPassword?: string;
	};
	network: NetworkConfig;
	logger: {
		logFileName: string;
		fileLogLevel: string;
		consoleLogLevel: string;
	};
	genesisConfig: GenesisConfig;
	constants: ApplicationConstants;
	modules: ModulesOptions;
}
