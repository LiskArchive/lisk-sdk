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
import { APIContext, EventQueue } from '../../state_machine';
import { ImmutableAPIContext, ImmutableSubStore, SubStore } from '../../state_machine/types';

export type StoreCallback = (moduleID: Buffer, storePrefix: number) => SubStore;
export type ImmutableStoreCallback = (moduleID: Buffer, storePrefix: number) => ImmutableSubStore;
export interface CCMsg {
	readonly nonce: bigint;
	readonly moduleID: Buffer;
	readonly crossChainCommandID: Buffer;
	readonly sendingChainID: Buffer;
	readonly receivingChainID: Buffer;
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
	feeAddress: Buffer;
	ccm: CCMsg;
}

export interface BeforeApplyCCMsgAPIContext extends CCAPIContext {
	ccu: CCUpdateParams;
	trsSender: Buffer;
}

export interface BeforeSendCCMsgAPIContext extends CCAPIContext {
	feeAddress: Buffer;
}

export interface BeforeRecoverCCMsgAPIContext extends CCAPIContext {
	trsSender: Buffer;
}

export interface RecoverCCMsgAPIContext extends CCAPIContext {
	terminatedChainID: Buffer;
	moduleID: Buffer;
	storePrefix: number;
	storeKey: Buffer;
	storeValue: Buffer;
}

export interface SendInternalContext {
	moduleID: Buffer;
	crossChainCommandID: Buffer;
	receivingChainID: Buffer;
	fee: bigint;
	status: number;
	params: Buffer;
	timestamp?: number;
	getAPIContext: () => APIContext;
	getStore: StoreCallback;
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueue;
	feeAddress: Buffer;
}

export interface TerminateChainContext {
	getAPIContext: () => APIContext;
	getStore: StoreCallback;
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueue;
}

export interface CCMApplyContext {
	getAPIContext: () => APIContext;
	getStore: StoreCallback;
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueue;
	feeAddress: Buffer;
	ccm: CCMsg;
	ccu: CCUpdateParams;
	trsSender: Buffer;
	ccmSize: bigint;
}

export interface CCMForwardContext {
	getAPIContext: () => APIContext;
	getStore: StoreCallback;
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueue;
	feeAddress: Buffer;
	ccm: CCMsg;
	ccu: CCUpdateParams;
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

export interface OwnChainAccount {
	name: string;
	id: Buffer;
	nonce: bigint;
}

export interface Inbox {
	appendPath: Buffer[];
	size: number;
	root: Buffer;
}

export interface Outbox {
	appendPath: Buffer[];
	size: number;
	root: Buffer;
}

export interface MessageFeeTokenID {
	chainID: Buffer;
	localID: Buffer;
}
export interface ChannelData {
	inbox: Inbox;
	outbox: Outbox;
	partnerChainOutboxRoot: Buffer;
	messageFeeTokenID: MessageFeeTokenID;
}

export interface TerminatedStateAccount {
	stateRoot: Buffer;
	mainchainStateRoot?: Buffer;
	initialized?: boolean;
}

export interface CCCommandExecuteContext {
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueue;
	ccm: CCMsg;
	ccmSize: bigint;
	getAPIContext: () => APIContext;
	getStore: StoreCallback;
	feeAddress: Buffer;
}

export interface ActiveValidators {
	blsKey: Buffer;
	bftWeight: bigint;
}

export interface RegistrationParametersValidator {
	blsKey: Buffer;
	bftWeight: bigint;
}

export interface SidechainRegistrationParams {
	name: string;
	genesisBlockID: Buffer;
	initValidators: RegistrationParametersValidator[];
	certificateThreshold: bigint;
}

export interface MainchainRegistrationParams {
	ownChainID: Buffer;
	ownName: string;
	mainchainValidators: RegistrationParametersValidator[];
	signature: Buffer;
	aggregationBits: Buffer;
}

export interface ValidatorKeys {
	generatorKey: Buffer;
	blsKey: Buffer;
}

export interface ValidatorsAPI {
	getValidatorAccount(apiContext: ImmutableAPIContext, address: Buffer): Promise<ValidatorKeys>;
}

export interface CrossChainCommandDependencies {
	validatorsAPI: ValidatorsAPI;
}

export interface ValidatorsHashInput {
	activeValidators: ActiveValidator[];
	certificateThreshold: bigint;
}

export interface TerminatedOutboxAccount {
	outboxRoot: Buffer;
	outboxSize: number;
	partnerChainInboxSize: number;
}

export interface MessageRecoveryParams {
	chainID: Buffer;
	crossChainMessages: Buffer[];
	idxs: number[];
	siblingHashes: Buffer[];
}

export interface MessageRecoveryVerificationParams {
	crossChainMessages: Buffer[];
	idxs: number[];
	siblingHashes: Buffer[];
}

export interface StoreEntry {
	storePrefix: number;
	storeKey: Buffer;
	storeValue: Buffer;
	bitmap: Buffer;
}

export interface StateRecoveryParams {
	chainID: Buffer;
	moduleID: Buffer;
	storeEntries: StoreEntry[];
	siblingHashes: Buffer[];
}

export interface StateRecoveryInitParams {
	chainID: Buffer;
	sidechainChainAccount: Buffer;
	bitmap: Buffer;
	siblingHashes: Buffer[];
}

export interface CrossChainUpdateTransactionParams {
	sendingChainID: Buffer;
	certificate: Buffer;
	activeValidatorsUpdate: ActiveValidator[];
	newCertificateThreshold: bigint;
	inboxUpdate: InboxUpdate;
}

export interface ChainValidators {
	activeValidators: ActiveValidator[];
	certificateThreshold: bigint;
}
