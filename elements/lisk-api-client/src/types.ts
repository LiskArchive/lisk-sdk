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
 *
 */

import { Schema } from '@liskhq/lisk-codec';

export interface Defer<T> {
	promise: Promise<T>;
	resolve: (result: T) => void;
	reject: (error?: Error) => void;
}

export interface JSONRPCNotification<T> {
	readonly id: never;
	readonly jsonrpc: string;
	readonly method: string;
	readonly params?: T;
}

export interface JSONRPCError {
	code: number;
	message: string;
	data?: string | number | boolean | Record<string, unknown>;
}

export interface JSONRPCResponse<T> {
	readonly id: number;
	readonly jsonrpc: string;
	readonly method: never;
	readonly params: never;
	readonly error?: JSONRPCError;
	readonly result?: T;
}

export type JSONRPCMessage<T> = JSONRPCNotification<T> | JSONRPCResponse<T>;

export type EventCallback<T = Record<string, unknown>> = (event?: T) => void | Promise<void>;

export interface Channel {
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	invoke: <T>(actionName: string, params?: Record<string, unknown>) => Promise<T>;
	subscribe: (eventName: string, cb: EventCallback) => void;
}

export interface RegisteredSchemas {
	block: Schema;
	header: Schema;
	asset: Schema;
	transaction: Schema;
	event: Schema;
}

export interface ModuleMetadata {
	id: string;
	name: string;
	endpoints: {
		name: string;
		request?: Schema;
		response: Schema;
	}[];
	events: {
		name: string;
		data: Schema;
	}[];
	commands: {
		id: string;
		name: string;
		params: Schema;
	}[];
	assets: {
		version: number;
		data: Schema;
	}[];
	stores: {
		key: string;
		data: Schema;
	}[];
}

export interface GenesisConfig {
	[key: string]: unknown;
	readonly bftBatchSize: number;
	readonly chainID: string;
	readonly blockTime: number;
	readonly maxTransactionsSize: number;
}

export interface NodeInfo {
	readonly version: string;
	readonly networkVersion: string;
	readonly chainID: string;
	readonly lastBlockID: string;
	readonly height: number;
	readonly genesisHeight: number;
	readonly finalizedHeight: number;
	readonly syncing: boolean;
	readonly unconfirmedTransactions: number;
	readonly genesis: GenesisConfig;
	readonly network: {
		readonly port: number;
		readonly hostIp?: string;
		readonly seedPeers: {
			readonly ip: string;
			readonly port: number;
		}[];
		readonly blacklistedIPs?: string[];
		readonly fixedPeers?: string[];
		readonly whitelistedPeers?: {
			readonly ip: string;
			readonly port: number;
		}[];
	};
}

export interface MultiSignatureKeys {
	readonly mandatoryKeys: Buffer[];
	readonly optionalKeys: Buffer[];
	readonly numberOfSignatures: number;
}

export interface NetworkStats {
	[key: string]: unknown;
	readonly outgoing: {
		count: number;
		connects: number;
		disconnects: number;
	};
	readonly incoming: {
		count: number;
		connects: number;
		disconnects: number;
	};
	readonly banning: {
		count: number;
		bannedPeers: {
			[key: string]: {
				lastBanTime: number;
				banCount: number;
			};
		};
	};
	readonly totalConnectedPeers: number;
	readonly totalDisconnectedPeers: number;
	readonly totalErrors: number;
	readonly totalRemovedPeers: number;
	readonly totalMessagesReceived: {
		[key: string]: number;
	};
	readonly totalRequestsReceived: {
		[key: string]: number;
	};
	readonly totalPeersDiscovered: number;
	readonly startTime: number;
}

export interface PeerInfo {
	readonly ipAddress: string;
	readonly port: number;
	readonly chainID?: Buffer;
	readonly networkVersion?: string;
	readonly nonce?: string;
	readonly options?: { [key: string]: unknown };
}

type Primitive = string | number | bigint | boolean | null | undefined;
type Replaced<T, TReplace, TWith, TKeep = Primitive> = T extends TReplace | TKeep
	? T extends TReplace
		? TWith | Exclude<T, TReplace>
		: T
	: {
			[P in keyof T]: Replaced<T[P], TReplace, TWith, TKeep>;
	  };

export type JSONObject<T> = Replaced<T, bigint | Buffer, string>;

export interface BlockHeader {
	readonly version: number;
	readonly height: number;
	readonly generatorAddress: Buffer;
	readonly previousBlockID: Buffer;
	readonly timestamp: number;
	readonly maxHeightPrevoted: number;
	readonly maxHeightGenerated: number;
	readonly aggregateCommit: {
		readonly height: number;
		readonly aggregationBits: Buffer;
		readonly certificateSignature: Buffer;
	};
	readonly validatorsHash: Buffer;
	readonly stateRoot: Buffer;
	readonly transactionRoot: Buffer;
	readonly assetRoot: Buffer;
	readonly eventRoot: Buffer;
	readonly signature: Buffer;
	readonly id: Buffer;
}

export type BlockHeaderJSON = JSONObject<BlockHeader>;

export interface BlockAsset {
	module: string;
	data: Buffer;
}

export type BlockAssetJSON = JSONObject<BlockAsset>;
export type DecodedBlockAsset<T = Record<string, unknown>> = Omit<BlockAsset, 'data'> & { data: T };
export type DecodedBlockAssetJSON<T = Record<string, unknown>> = Omit<BlockAssetJSON, 'data'> & {
	data: T;
};

export interface Transaction {
	readonly module: string;
	readonly command: string;
	readonly senderPublicKey: Buffer;
	readonly nonce: bigint;
	readonly fee: bigint;
	readonly params: Buffer;
	readonly signatures: ReadonlyArray<Buffer>;
	readonly id: Buffer;
}

export type TransactionJSON = JSONObject<Transaction>;
export type DecodedTransaction<T = Record<string, unknown>> = Omit<Transaction, 'params'> & {
	params: T;
};
export type DecodedTransactionJSON<T = Record<string, unknown>> = Omit<
	TransactionJSON,
	'params'
> & { params: T };

export interface Block {
	header: BlockHeader;
	transactions: Transaction[];
	assets: BlockAsset[];
}

export interface DecodedBlock {
	header: BlockHeader;
	transactions: DecodedTransaction[];
	assets: DecodedBlockAsset[];
}

export interface BlockJSON {
	header: BlockHeaderJSON;
	transactions: TransactionJSON[];
	assets: BlockAssetJSON[];
}

export interface DecodedBlockJSON {
	header: BlockHeaderJSON;
	transactions: DecodedTransactionJSON[];
	assets: DecodedBlockAssetJSON[];
}

export interface Event {
	readonly module: string;
	/**
	 * several events can be emitted from each module, e.g.
	 * token module transfer event
	 * nft module transfer event
	 *
	 * name of event
	 */
	readonly name: string;
	readonly topics: Buffer[];
	readonly index: number;
	readonly data: Buffer;
}

export type EventJSON = JSONObject<Event>;
export type DecodedEventJSON<T = Record<string, unknown>> = Omit<EventJSON, 'data'> & { data: T };
