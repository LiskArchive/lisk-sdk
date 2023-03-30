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
} from 'lisk-sdk';

export interface BlockHeader extends chain.BlockHeaderAttrs {
	validatorsHash: Buffer;
}

export interface ChainConnectorPluginConfig {
	receivingChainID: string;
	receivingChainWsURL?: string;
	receivingChainIPCPath?: string;
	ccuFrequency: number;
	encryptedPrivateKey: string;
	ccuFee: string;
	password: string;
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

export interface ValidatorsData {
	certificateThreshold: bigint;
	validators: ActiveValidatorWithAddress[];
	validatorsHash: Buffer;
}

export interface LastSentCCMWithHeight extends CCMsg {
	height: number;
}

export interface CCMsFromEvents {
	ccms: CCMsg[];
	height: number;
	inclusionProof: OutboxRootWitness;
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

export type LastSentCCMWithHeightJSON = JSONObject<LastSentCCMWithHeight>;

export type AggregateCommitJSON = JSONObject<AggregateCommit>;

export type BFTValidatorJSON = JSONObject<BFTValidator>;

export type ValidatorsDataJSON = JSONObject<ValidatorsData>;

export type ProofJSON = JSONObject<Proof>;

export type ProveResponseJSON = JSONObject<ProveResponse>;

export type BFTParametersJSON = JSONObject<BFTParameters>;
