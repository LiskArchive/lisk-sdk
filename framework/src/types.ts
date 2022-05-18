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
import { Logger } from './logger';
import { ImmutableAPIContext, ImmutableSubStore } from './node/state_machine';
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
	communityIdentifier: string;
	maxTransactionsSize: number;
	minFeePerByte: number;
	blockTime: number;
	baseFees: {
		moduleID: number;
		commandID: number;
		baseFee: string;
	}[];
	modules: Record<string, Record<string, unknown>>;
}

export interface TransactionPoolConfig {
	readonly maxTransactions?: number;
	readonly maxTransactionsPerAccount?: number;
	readonly transactionExpiryTime?: number;
	readonly minEntranceFeePriority?: string;
	readonly minReplacementFeeDifference?: string;
}

export interface SystemConfig {
	keepEventsForHeights: number;
}

type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>;
};

export interface RPCConfig {
	modes: (typeof RPC_MODES.IPC | typeof RPC_MODES.WS)[];
	ws?: {
		port: number;
		path: string;
		host: string;
	};
	ipc?: {
		path: string;
	};
	http?: {
		port: number;
		host: string;
	};
}

export interface Generator {
	readonly address: string;
	readonly encryptedPassphrase: string;
}

export interface GenerationConfig {
	waitThreshold: number;
	generators: Generator[];
	force?: boolean;
	defaultPassword?: string;
	modules: Record<string, Record<string, unknown>>;
}

export interface PluginConfig extends Record<string, unknown> {
	readonly loadAsChildProcess?: boolean;
}

export interface ApplicationConfig {
	label: string;
	version: string;
	networkVersion: string;
	rootPath: string;
	genesis: GenesisConfig;
	generation: GenerationConfig;
	network: NetworkConfig;
	system: SystemConfig;
	logger: {
		logFileName: string;
		fileLogLevel: string;
		consoleLogLevel: string;
	};
	plugins: {
		[key: string]: PluginConfig;
	};
	transactionPool: TransactionPoolConfig;
	rpc: RPCConfig;
}

export type ApplicationConfigForPlugin = Omit<ApplicationConfig, 'plugins'>;

export type PartialApplicationConfig = RecursivePartial<ApplicationConfig>;

export interface EndpointInfo {
	readonly namespace: string;
	readonly method: string;
}

export interface RegisteredModule {
	id: number;
	name: string;
	endpoints: string[];
	events: string[];
	commands: {
		id: number;
		name: string;
	}[];
}

export interface RegisteredSchema {
	block: Schema;
	blockHeader: Schema;
	transaction: Schema;
	commands: {
		moduleID: number;
		moduleName: string;
		commandID: number;
		commandName: string;
		schema?: Schema;
	}[];
}

export interface SchemaWithDefault extends Schema {
	readonly default?: Record<string, unknown>;
}

export interface PluginEndpointContext {
	params: Record<string, unknown>;
	logger: Logger;
}

export interface ModuleEndpointContext extends PluginEndpointContext {
	getStore: (moduleID: number, storePrefix: number) => ImmutableSubStore;
	getImmutableAPIContext: () => ImmutableAPIContext;
	networkIdentifier: Buffer;
}

export type EndpointHandler = (
	context: PluginEndpointContext | ModuleEndpointContext,
) => Promise<unknown>;

export type EndpointHandlers = Record<string, EndpointHandler>;

type Primitive = string | number | bigint | boolean | null | undefined;
type Replaced<T, TReplace, TWith, TKeep = Primitive> = T extends TReplace | TKeep
	? T extends TReplace
		? TWith | Exclude<T, TReplace>
		: T
	: {
			[P in keyof T]: Replaced<T[P], TReplace, TWith, TKeep>;
	  };

export type JSONObject<T> = Replaced<T, bigint | Buffer, string>;
