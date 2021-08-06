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
import { ImmutableSubStore } from './node/state_machine';

export interface SocketPaths {
	readonly pub: string;
	readonly sub: string;
	readonly rpc: string;
	readonly root: string;
}

export interface PluginOptions extends Record<string, unknown> {
	readonly loadAsChildProcess?: boolean;
	readonly alias?: string;
}

export interface AppConfigForPlugin {
	readonly rootPath: string;
	readonly version: string;
	readonly networkVersion: string;
	readonly genesisConfig: GenesisConfig;
	readonly label: string;
	readonly logger: {
		readonly consoleLogLevel: string;
		readonly fileLogLevel: string;
	};
}

export interface PluginOptionsWithAppConfig extends PluginOptions {
	// TODO: Remove data path from here and use from appConfig
	readonly dataPath: string;
	appConfig: AppConfigForPlugin;
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
	[key: string]: unknown;
	bftThreshold: number;
	communityIdentifier: string;
	blockTime: number;
	maxPayloadLength: number;
	rewards: {
		milestones: string[];
		offset: number;
		distance: number;
	};
	minFeePerByte: number;
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

type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>;
};

interface RPCConfig {
	enable: boolean;
	mode: 'ipc' | 'ws';
	port: number;
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

export interface ApplicationConfig {
	label: string;
	version: string;
	networkVersion: string;
	rootPath: string;
	genesis: GenesisConfig;
	generation: GenerationConfig;
	network: NetworkConfig;
	logger: {
		logFileName: string;
		fileLogLevel: string;
		consoleLogLevel: string;
	};
	genesisConfig: GenesisConfig;
	plugins: {
		[key: string]: PluginOptions;
	};
	transactionPool: TransactionPoolConfig;
	rpc: RPCConfig;
}

export type PartialApplicationConfig = RecursivePartial<ApplicationConfig>;

export interface ActionInfoForBus {
	readonly module: string;
	readonly name: string;
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
		schema: Schema;
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
}
