/*
 * Copyright © 2022 Lisk Foundation
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

import {
	Transaction,
	chain,
	CCMsg,
	OutboxRootWitness,
	ActiveValidator,
	AggregateCommit,
	BFTParameters,
	Proof,
	ProveResponse,
	BFTValidator,
	Schema,
	ActiveValidatorsUpdate,
	InboxUpdate,
} from 'lisk-sdk';

export interface BlockHeader extends chain.BlockHeaderAttrs {
	validatorsHash: Buffer;
}

export interface Logger {
	readonly trace: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly debug: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly info: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly warn: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly error: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly fatal: (data?: Record<string, unknown> | unknown, message?: string) => void;
	readonly level: () => number;
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

export type ModuleMetadata = {
	stores: {
		key: string;
		data: Schema;
	}[];
	events: {
		name: string;
		data: Schema;
	}[];
	name: string;
};
export type ModulesMetadata = ModuleMetadata[];

export interface ChainConnectorPluginConfig {
	receivingChainID: string;
	receivingChainWsURL?: string;
	receivingChainIPCPath?: string;
	ccuFrequency: number;
	encryptedPrivateKey: string;
	ccuFee: string;
	isSaveCCU: boolean;
	maxCCUSize: number;
	registrationHeight: number;
	ccuSaveLimit: number;
}

export type SentCCUs = Transaction[];
export type SentCCUsJSON = chain.TransactionJSON[];

export interface ActiveValidatorWithAddress extends ActiveValidator {
	address: Buffer;
}

export interface BFTParametersWithoutGeneratorKey extends Omit<BFTParameters, 'validators'> {
	validators: {
		address: Buffer;
		bftWeight: bigint;
		blsKey: Buffer;
	}[];
}

export interface ValidatorsDataWithHeight {
	certificateThreshold: bigint;
	validators: ActiveValidatorWithAddress[];
	validatorsHash: Buffer;
	height: number;
}

export interface LastSentCCMWithHeight extends CCMsg {
	height: number;
}

export interface LastSentCCM extends CCMsg {
	height: number;
	outboxSize: number;
}

export interface CCMWithHeight extends CCMsg {
	height: number;
}
export interface CCMsFromEvents {
	ccms: CCMsg[];
	height: number;
	inclusionProof: OutboxRootWitness;
	outboxSize: number;
}

export interface CCUpdateParams {
	sendingChainID: Buffer;
	certificate: Buffer;
	activeValidatorsUpdate: ActiveValidatorsUpdate;
	certificateThreshold: bigint;
	inboxUpdate: InboxUpdate;
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

export type CCMsFromEventsJSON = JSONObject<CCMsFromEvents>;

export type CCMWithHeightJSON = JSONObject<CCMWithHeight>;

export type LastSentCCMWithHeightJSON = JSONObject<LastSentCCMWithHeight>;

export type AggregateCommitJSON = JSONObject<AggregateCommit>;

export type BFTValidatorJSON = JSONObject<BFTValidator>;

export type ValidatorsDataHeightJSON = JSONObject<ValidatorsDataWithHeight>;

export type ProofJSON = JSONObject<Proof>;

export type ProveResponseJSON = JSONObject<ProveResponse>;

export type BFTParametersJSON = JSONObject<BFTParameters>;
