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
import { Schema } from '@liskhq/lisk-codec';

export interface StringKeyVal {
	[key: string]: string;
}

/* Start P2P */
export interface SeedPeerInfo {
	readonly ip: string;
	readonly port: number;
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
	readonly transactionIds?: string[];
}

export interface RPCHighestCommonBlockData {
	readonly ids: string[];
}
/* End P2P */

export interface PluginOptions extends Record<string, unknown> {
	readonly loadAsChildProcess?: boolean;
}

export interface PluginsOptions {
	[key: string]: PluginOptions;
}

export interface DelegateConfig {
	readonly address: string;
	readonly encryptedPassphrase: string;
	readonly hashOnion: {
		readonly count: number;
		readonly distance: number;
		readonly hashes: string[];
	};
}

export interface NetworkConfig {
	port: number;
	seedPeers: { ip: string; port: number }[];
	hostIp?: string;
	blacklistedIPs?: string[];
	fixedPeers?: { ip: string; port: number }[];
	whitelistedPeers?: { ip: string; port: number }[];
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
	networkVersion: string;
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
	plugins: PluginsOptions;
}

export interface ActionInfoForBus {
	readonly module: string;
	readonly name: string;
}

/* Start codec */
export interface CodecSchema {
	account: Schema;
	blockSchema: Schema;
	blockHeaderSchema: Schema;
	blockHeadersAssets: {
		[key: number]: Schema;
	};
	baseTransaction: Schema;
	transactionsAssets: {
		[key: number]: Schema;
	};
}

export interface AccountJSON {
	address: string;
	balance: string;
	nonce: string;
	keys: {
		numberOfSignatures: number;
		mandatoryKeys: string[];
		optionalKeys: string[];
	};
	asset: {
		delegate: {
			username: string;
			pomHeights: number[];
			consecutiveMissedBlocks: number;
			lastForgedHeight: number;
			isBanned: boolean;
			totalVotesReceived: string;
		};
		sentVotes: { delegateAddress: string; amount: string }[];
		unlocking: {
			delegateAddress: string;
			amount: string;
			unvoteHeight: number;
		}[];
	};
}

export interface BaseTransactionJSON {
	readonly type: number;
	readonly nonce: string;
	readonly fee: string;
	readonly senderPublicKey: string;
	readonly signatures: Array<Readonly<string>>;

	readonly asset: string;
}

export interface BlockJSON {
	readonly header: BlockHeaderJSON;
	readonly payload: ReadonlyArray<TransactionJSON>;
}

export interface BaseBlockHeaderJSON {
	readonly id: string;
	readonly version: number;
	readonly timestamp: number;
	readonly height: number;
	readonly previousBlockID: string;
	readonly transactionRoot: string;
	readonly generatorPublicKey: string;
	readonly reward: string;
	readonly signature: string;
	readonly asset: string;
}

type BlockHeaderJSON = Omit<BaseBlockHeaderJSON, 'asset'> & { asset: BlockAssetJSON };

export type BlockAssetJSON = {
	readonly seedReveal: string;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
}

export interface TransactionJSON {
	readonly type: number;
	readonly nonce: string;
	readonly fee: string;
	readonly senderPublicKey: string;
	readonly signatures: Array<Readonly<string>>;

	readonly id: string;
	readonly asset: object;
}
/* End codec */
