import { CCMsg, Schema, chain, db, OutboxRootWitness, ProveResponse } from 'lisk-sdk';
import { QueryProof } from 'lisk-framework';

export interface CCMsInfo {
	ccms: CCMsg[];
}

export interface RecoveryPluginConfig {
	mainchainIPCPath?: string;
	sidechainIPCPath?: string;
	encryptedPrivateKey: string;

	senderLSKAddress: string;
	sidechainPublicKey: string;

	password: string;
	fee: bigint;
}

export interface EventsParserConfig {
	mainchainIPCPath?: string;
	sidechainIPCPath?: string;
}

export type ModuleMetadata = {
	stores: { key: string; data: Schema }[];
	events: { name: string; data: Schema }[];
	name: string;
};

export type ModulesMetadata = [ModuleMetadata];
export type BlockEvents = JSONObject<chain.EventAttr[]>;

export interface Data {
	readonly blockHeader: chain.BlockHeaderJSON;
}

type Primitive = string | number | bigint | boolean | null | undefined;
type Replaced<T, TReplace, TWith, TKeep = Primitive> = T extends TReplace | TKeep
	? T extends TReplace
		? TWith | Exclude<T, TReplace>
		: T
	: {
			[P in keyof T]: Replaced<T[P], TReplace, TWith, TKeep>;
	  };

type JSONObject<T> = Replaced<T, bigint | Buffer, string>;
export type ProveResponseJSON = JSONObject<ProveResponse>;

export interface Proof {
	siblingHashes: Buffer[];
	queries: QueryProof[];
}

export interface InclusionProof {
	height: number;
	stateRoot: Buffer;
	inclusionProof: OutboxRootWitness & { key: Buffer; value: Buffer };
	storeValue: Buffer;
	storeKey: Buffer;
}

export interface StoreEntry {
	substorePrefix: Buffer;
	storeKey: Buffer;
	storeValue: Buffer;
	bitmap: Buffer;
}

export interface StateRecoveryParams {
	chainID: Buffer;
	module: string;
	storeEntries: StoreEntry[];
	siblingHashes: Buffer[];
}

// TODO: Try to create distinct types (e.g for `inclusionProof`)
export interface InclusionProofWithHeightAndStateRoot {
	height: number;
	stateRoot: Buffer;
	inclusionProof: OutboxRootWitness & { key: Buffer; value: Buffer };
}

export interface MessageRecoveryInitializationPluginConfig {
	mainchainIPCPath?: string;
	sidechainIPCPath?: string;
	encryptedPrivateKey: string;
	password: string;
	fee: bigint;
}

export type KVStore = db.Database;
