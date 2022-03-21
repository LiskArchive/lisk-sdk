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

import { Logger } from '../../logger';
import { APIContext, EventQueue } from '../../node/state_machine';
import { SubStore } from '../../node/state_machine/types';

export interface CCMsg {
	readonly nonce: bigint;
	readonly moduleID: number;
	readonly crossChainCommandID: number;
	readonly sendingChainID: number;
	readonly receivingChainID: number;
	readonly fee: bigint;
	readonly status: number;
	readonly params: Buffer;
}

export interface ActiveValidator {
	blsKey: Buffer;
	bftWeight: bigint;
}

export interface MsgWitness {
	partnerChainOutboxSize: bigint;
	siblingHashes: Buffer[];
}

export interface OutboxRootWitness {
	bitmap: Buffer;
	siblingHashes: Buffer[];
}

export interface InboxUpdate {
	crossChainMessages: Buffer[];
	messageWitness: MsgWitness;
	outboxRootWitness: OutboxRootWitness;
}

export interface CCUpdateParams {
	sendingChainID: number;
	certificate: Buffer;
	activeValidatorsUpdate: ActiveValidator[];
	newCertificateThreshold: bigint;
	inboxUpdate: InboxUpdate;
}

export interface CCAPIContext {
	getAPIContext: () => APIContext;
	getStore: (moduleID: number, storePrefix: number) => SubStore;
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueue;
	ccm: CCMsg;
}

export interface BeforeApplyCCMsgAPIContext extends CCAPIContext {
	ccu: CCUpdateParams;
}

export interface BeforeSendCCMsgAPIContext extends CCAPIContext {
	payFromAddress: Buffer;
}

export interface BeforeRecoverCCMsgAPIContext extends CCAPIContext {
	trsSender: Buffer;
}

export interface RecoverCCMsgAPIContext extends CCAPIContext {
	terminatedChainID: number;
	moduleID: number;
	storePrefix: number;
	storeKey: number;
	storeValue: Buffer;
}

export interface SendInternalContext {
	feeAddress: Buffer;
	moduleID: number;
	crossChainCommandID: number;
	receivingChainID: number;
	fee: bigint;
	status: number;
	params: Buffer;
}

export interface LastCertificate {
	height: number;
	timestamp: number;
	stateRoot: Buffer;
	validatorsHash: Buffer;
}
export interface ChainAccount {
	name: string;
	networkID: Buffer;
	lastCertificate: LastCertificate;
	status: number;
}

export interface Inbox {
	appendPath: Buffer[];
	size: bigint;
	root: Buffer;
}

export interface Outbox {
	appendPath: Buffer[];
	size: bigint;
	root: Buffer;
}

export interface MessageFeeTokenID {
	chainID: number;
	localID: number;
}
export interface ChannelData {
	inbox: Inbox;
	putbox: Outbox;
	partnerChainOutboxRoot: Buffer;
	messageFeeTokenID: MessageFeeTokenID;
}

export interface TerminatedStateAccount {
	stateRoot: Buffer;
}
