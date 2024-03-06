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
import { Schema } from '@liskhq/lisk-codec';
import { Logger } from './logger';
import { ImmutableMethodContext, ImmutableSubStore, SubStore } from './state_machine/types';
import { RPC_MODES } from './constants';

export interface SocketPaths {
	readonly ipc: {
		readonly path: string;
	};
}

export enum ChannelType {
	InMemory = 'inMemory',
	ChildProcess = 'ipc',
}

export interface PluginOptions extends Record<string, unknown> {
	readonly loadAsChildProcess?: boolean;
}

export interface ValidatorConfig {
	readonly address: string;
	readonly encryptedPassphrase: string;
	readonly hashOnion: {
		readonly count: number;
		readonly distance: number;
		readonly hashes: string[];
	};
}

export interface NetworkConfig {
	version: string;
	port: number;
	seedPeers: { ip: string; port: number }[];
	host?: string;
	blacklistedIPs?: string[];
	fixedPeers?: { ip: string; port: number }[];
	whitelistedPeers?: { ip: string; port: number }[];
	maxOutboundConnections?: number;
	maxInboundConnections?: number;
	wsMaxPayload?: number;
	advertiseAddress?: boolean;
}

export interface GenesisConfig {
	block: {
		fromFile?: string;
		blob?: string;
	};
	chainID: string;
	maxTransactionsSize: number;
	blockTime: number;
	bftBatchSize: number;
	minimumCertifyHeight: number;
}

export interface TransactionPoolConfig {
	readonly maxTransactions?: number;
	readonly maxTransactionsPerAccount?: number;
	readonly transactionExpiryTime?: number;
	readonly minEntranceFeePriority?: string;
	readonly minReplacementFeeDifference?: string;
}

export interface SystemConfig {
	version: string;
	dataPath: string;
	logLevel: string;
	keepEventsForHeights: number;
	keepInclusionProofsForHeights: number;
	inclusionProofKeys: string[];
	backup: {
		height: number;
	};
	enableMetrics: boolean;
}

type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>;
};

export interface RPCConfig {
	modes: (typeof RPC_MODES.IPC | typeof RPC_MODES.WS | typeof RPC_MODES.HTTP)[];
	port: number;
	host: string;
	allowedMethods?: string[];
	accessControlAllowOrigin: string;
}

export interface LegacyConfig {
	sync: boolean;
	brackets: {
		startHeight: number;
		snapshotHeight: number;
		snapshotBlockID: string;
	}[];
}

export interface GeneratorConfig {
	keys: {
		fromFile?: string;
	};
}

export interface PluginConfig extends Record<string, unknown> {
	readonly loadAsChildProcess?: boolean;
}

export interface ApplicationConfig {
	system: SystemConfig;
	rpc: RPCConfig;
	legacy: LegacyConfig;
	genesis: GenesisConfig;
	network: NetworkConfig;
	transactionPool: TransactionPoolConfig;
	generator: GeneratorConfig;
	modules: {
		[key: string]: Record<string, unknown>;
	};
	plugins: {
		[key: string]: PluginConfig;
	};
}

export type EngineConfig = Omit<ApplicationConfig, 'modules' | 'plugins'>;

export type ApplicationConfigForPlugin = Omit<ApplicationConfig, 'plugins'>;

export type PartialApplicationConfig = RecursivePartial<ApplicationConfig>;

export interface EndpointInfo {
	readonly namespace: string;
	readonly method: string;
}

export interface RegisteredSchema {
	block: Schema;
	header: Schema;
	transaction: Schema;
	asset: Schema;
	event: Schema;
}

export interface SchemaWithDefault extends Schema {
	readonly default?: Record<string, unknown>;
}

export interface PluginEndpointContext {
	params: Record<string, unknown>;
	logger: Logger;
}

export interface ModuleEndpointContext extends PluginEndpointContext {
	getStore: (moduleID: Buffer, storePrefix: Buffer) => ImmutableSubStore;
	getOffchainStore: (moduleID: Buffer, storePrefix: Buffer) => SubStore;
	getImmutableMethodContext: () => ImmutableMethodContext;
	header: {
		height: number;
		timestamp: number;
		aggregateCommit: {
			height: number;
		};
	};
	chainID: Buffer;
}

export type EndpointHandler = (
	context: PluginEndpointContext | ModuleEndpointContext,
) => Promise<unknown>;

export type EndpointHandlers = Map<string, EndpointHandler>;

type Primitive = string | number | bigint | boolean | null | undefined;
type Replaced<T, TReplace, TWith, TKeep = Primitive> = T extends TReplace | TKeep
	? T extends TReplace
		? TWith | Exclude<T, TReplace>
		: T
	: {
			[P in keyof T]: Replaced<T[P], TReplace, TWith, TKeep>;
	  };

export type JSONObject<T> = Replaced<T, bigint | Buffer, string>;

export interface Event {
	readonly module: string;
	readonly name: string;
	readonly topics: Buffer[];
	readonly index: number;
	readonly data: Buffer;
}

export type EventJSON = JSONObject<Event>;
