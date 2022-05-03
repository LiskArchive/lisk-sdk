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

// TODO: Remove this file and replace with interoperability types

import { Schema } from '@liskhq/lisk-codec';
import { Logger } from '../../logger';
import { APIContext, EventQueue } from '../../node/state_machine';
import { SubStore } from '../../node/state_machine/types';

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
	sendingChainID: Buffer;
	certificate: Buffer;
	activeValidatorsUpdate: ActiveValidator[];
	newCertificateThreshold: bigint;
	inboxUpdate: InboxUpdate;
}

export interface CCAPIContext {
	getAPIContext: () => APIContext;
	getStore: StoreCallback;
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueue;
	ccm: CCMsg;
	feeAddress: Buffer;
}

export interface BeforeApplyCCMsgAPIContext extends CCAPIContext {
	ccu: CCUpdateParams;
	trsSender: Buffer; // TODO: senderAddress would be more consistent with transaction
}

export interface BeforeSendCCMsgAPIContext extends CCAPIContext {
	feeAddress: Buffer;
}

export interface BeforeRecoverCCMsgAPIContext extends CCAPIContext {
	trsSender: Buffer; // TODO: senderAddress would be more consistent with transaction
}

export interface RecoverCCMsgAPIContext extends CCAPIContext {
	terminatedChainID: Buffer; // TODO: id should be buffer
	moduleID: number;
	storePrefix: number;
	storeKey: Buffer; // TODO: key should be buffer
	storeValue: Buffer;
}

export type StoreCallback = (moduleID: number, storePrefix: number) => SubStore;

export interface CCMsg {
	readonly nonce: bigint;
	readonly moduleID: number;
	readonly crossChainCommandID: number;
	readonly sendingChainID: Buffer;
	readonly receivingChainID: Buffer;
	readonly fee: bigint;
	readonly status: number;
	readonly params: Buffer;
}

export interface CCCommandExecuteContext {
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueue;
	ccm: CCMsg;
	ccmLength: number; // This is missing in the interoperability now
	getAPIContext: () => APIContext;
	getStore: StoreCallback;
	feeAddress: Buffer;
}

export abstract class BaseCCCommand {
	protected moduleID: number;
	public abstract ID: number;
	public abstract name: string;
	public abstract schema: Schema;

	public constructor(moduleID: number) {
		this.moduleID = moduleID;
	}
	public abstract execute(ctx: CCCommandExecuteContext): Promise<void>;
}
