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

import { Transaction, chain, BFTValidator, AggregateCommit, BFTValidatorJSON } from 'lisk-sdk';

export interface ChainConnectorPluginConfig {
	mainchainIPCPath: string;
	sidechainIPCPath: string;
	ccmBasedFrequency: number;
	livenessBasedFrequency: number;
}

export type SentCCUs = Transaction[];
export type SentCCUsJSON = chain.TransactionJSON[];

export interface ValidatorsData {
	certificateThreshold: BigInt;
	validators: BFTValidator[];
	validatorsHash: Buffer;
}

export interface ChainConnectorInfo {
	blockHeaders: chain.BlockHeader[];
	aggregateCommits: AggregateCommit[];
	validatorsHashPreimage: ValidatorsData[];
	crossChainMessages: CCMsg[];
}

export interface BFTParameters {
	prevoteThreshold: bigint;
	precommitThreshold: bigint;
	certificateThreshold: bigint;
	validators: BFTValidator[];
	validatorsHash: Buffer;
}

export interface Inbox {
	appendPath: Buffer[];
	size: number;
	root: Buffer;
}

export interface InboxJSON {
	appendPath: string[];
	size: number;
	root: string;
}

export interface Outbox {
	appendPath: Buffer[];
	size: number;
	root: Buffer;
}

export interface OutboxJSON {
	appendPath: string[];
	size: number;
	root: string;
}

export interface MessageFeeTokenID {
	chainID: Buffer;
	localID: Buffer;
}

export interface MessageFeeTokenIDJSON {
	chainID: string;
	localID: string;
}

export interface ChannelData {
	inbox: Inbox;
	outbox: Outbox;
	partnerChainOutboxRoot: Buffer;
	messageFeeTokenID: MessageFeeTokenID;
}

export interface ChannelDataJSON {
	inbox: InboxJSON;
	outbox: OutboxJSON;
	partnerChainOutboxRoot: string;
	messageFeeTokenID: MessageFeeTokenIDJSON;
}

export interface CCMsg {
	readonly nonce: bigint;
	readonly moduleID: Buffer;
	readonly crossChainCommandID: Buffer;
	readonly sendingChainID: Buffer;
	readonly receivingChainID: Buffer;
	readonly fee: bigint;
	readonly status: number;
	readonly params: Buffer;
	readonly id: Buffer;
}

export interface AggregateCommitJSON {
	readonly height: number;
	readonly aggregationBits: string;
	readonly certificateSignature: string;
}

export interface ValidatorsDataJSON {
	certificateThreshold: string;
	validators: BFTValidatorJSON[];
	validatorsHash: string;
}
