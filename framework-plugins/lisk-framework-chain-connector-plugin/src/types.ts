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

import { Transaction, chain, CCMsg, OutboxRootWitness, ActiveValidator } from 'lisk-sdk';

export interface BlockHeader extends chain.BlockHeaderAttrs {
	validatorsHash: Buffer;
}

export interface ChainConnectorPluginConfig {
	receivingChainWsURL?: string;
	receivingChainIPCPath?: string;
	ccuFrequency: number;
	encryptedPrivateKey: string;
	ccuFee: string;
	password: string;
	isSaveCCU: boolean;
	maxCCUSize: number;
	registrationHeight: number;
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

export interface AggregateCommitJSON {
	readonly height: number;
	readonly aggregationBits: string;
	readonly certificateSignature: string;
}

export interface BFTValidatorJSON {
	address: string;
	bftWeight: string;
	blsKey: string;
}

export interface ValidatorsDataJSON {
	certificateThreshold: string;
	validators: BFTValidatorJSON[];
	validatorsHash: string;
}

export interface Proof {
	siblingHashes: Buffer[];
	queries: QueryProof[];
}

export interface QueryProof {
	key: Buffer;
	value: Buffer;
	bitmap: Buffer;
}

export interface ProveResponse {
	proof: Proof;
}
export interface ProofJSON {
	siblingHashes: string[];
	queries: QueryProofJSON[];
}

export interface QueryProofJSON {
	key: string;
	value: string;
	bitmap: string;
}

export interface ProveResponseJSON {
	proof: ProofJSON;
}

export interface BFTValidator {
	address: Buffer;
	bftWeight: bigint;
	blsKey: Buffer;
}

export interface BFTParametersJSON {
	prevoteThreshold: string;
	precommitThreshold: string;
	certificateThreshold: string;
	validators: BFTValidatorJSON[];
	validatorsHash: string;
}

export interface BFTParameters {
	prevoteThreshold: bigint;
	precommitThreshold: bigint;
	certificateThreshold: bigint;
	validators: BFTValidator[];
	validatorsHash: Buffer;
}
