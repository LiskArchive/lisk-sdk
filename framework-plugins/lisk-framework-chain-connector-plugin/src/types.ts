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

import { Transaction, chain, CCMsg, ActiveValidator, OutboxRootWitness } from 'lisk-sdk';

export interface BlockHeader extends chain.BlockHeaderAttrs {
	validatorsHash: Buffer;
}

export interface ChainConnectorPluginConfig {
	mainchainIPCPath: string;
	sidechainIPCPath: string;
	ccmBasedFrequency: number;
	livenessBasedFrequency: number;
}

export type SentCCUs = Transaction[];
export type SentCCUsJSON = chain.TransactionJSON[];

export interface Validator {
	address: Buffer;
	bftWeight: bigint;
	blsKey: Buffer;
}

export interface ValidatorsData {
	certificateThreshold: bigint;
	validators: Validator[];
	validatorsHash: Buffer;
}

export interface CrossChainMessagesFromEvents {
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

export interface CrossChainUpdateTransactionParams {
	sendingChainID: Buffer;
	certificate: Buffer;
	activeValidatorsUpdate: ActiveValidator[];
	certificateThreshold: bigint;
	inboxUpdate: InboxUpdate;
}

export interface InboxUpdate {
	crossChainMessages: Buffer[];
	messageWitnessHashes: Buffer[];
	outboxRootWitness: OutboxRootWitness;
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
