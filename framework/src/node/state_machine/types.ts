/*
 * Copyright © 2021 Lisk Foundation
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
import { Transaction } from '@liskhq/lisk-chain';
import { IterateOptions } from '@liskhq/lisk-chain/dist-node/state_store';
import { Schema } from '@liskhq/lisk-codec';
import { Logger } from '../../logger';

export interface EventQueueAdder {
	add(moduleID: number, typeID: Buffer, data: Buffer, topics?: Buffer[], noRevert?: boolean): void;
}

export interface ImmutableSubStore {
	get(key: Buffer): Promise<Buffer>;
	getWithSchema<T>(key: Buffer, schema: Schema): Promise<T>;
	has(key: Buffer): Promise<boolean>;
	iterate(input: IterateOptions): Promise<{ key: Buffer; value: Buffer }[]>;
	iterateWithSchema<T>(input: IterateOptions, schema: Schema): Promise<{ key: Buffer; value: T }[]>;
}

export interface SubStore extends ImmutableSubStore {
	del(key: Buffer): Promise<void>;
	set(key: Buffer, value: Buffer): Promise<void>;
	// eslint-disable-next-line @typescript-eslint/ban-types
	setWithSchema(key: Buffer, value: object, schema: Schema): Promise<void>;
}

export interface ImmutableAPIContext {
	getStore: (moduleID: number, storePrefix: number) => ImmutableSubStore;
}

export interface APIContext {
	getStore: (moduleID: number, storePrefix: number) => SubStore;
	eventQueue: EventQueueAdder;
}

export enum VerifyStatus {
	FAIL = 0,
	OK = 1,
	PENDING = 2,
}

export interface BlockHeader {
	version: number;
	height: number;
	timestamp: number;
	previousBlockID: Buffer;
	generatorAddress: Buffer;
	maxHeightPrevoted: number;
	maxHeightGenerated: number;
	aggregateCommit: {
		height: number;
		aggregationBits: Buffer;
		certificateSignature: Buffer;
	};
}

export interface BlockAssets {
	getAsset: (moduleID: number) => Buffer | undefined;
}

export interface VerificationResult {
	status: VerifyStatus;
	error?: Error;
}
// eventQueue is not present here because event cannot be emitted
export interface TransactionVerifyContext {
	networkIdentifier: Buffer;
	logger: Logger;
	transaction: Transaction;
	getAPIContext: () => ImmutableAPIContext;
	getStore: (moduleID: number, storePrefix: number) => ImmutableSubStore;
}

export interface CommandVerifyContext<T = undefined> {
	logger: Logger;
	networkIdentifier: Buffer;
	transaction: Transaction; // without decoding params
	params: T;
	getAPIContext: () => ImmutableAPIContext;
	getStore: (moduleID: number, storePrefix: number) => ImmutableSubStore;
}

export interface CommandExecuteContext<T = undefined> {
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueueAdder;
	header: BlockHeader;
	assets: BlockAssets;
	transaction: Transaction; // without decoding params
	params: T;
	getAPIContext: () => APIContext;
	getStore: (moduleID: number, storePrefix: number) => SubStore;
}

export interface GenesisBlockExecuteContext {
	logger: Logger;
	eventQueue: EventQueueAdder;
	getAPIContext: () => APIContext;
	getStore: (moduleID: number, storePrefix: number) => SubStore;
	header: BlockHeader;
	assets: BlockAssets;
}

export interface TransactionExecuteContext {
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueueAdder;
	getAPIContext: () => APIContext;
	getStore: (moduleID: number, storePrefix: number) => SubStore;
	header: BlockHeader;
	assets: BlockAssets;
	transaction: Transaction;
}

export interface BlockVerifyContext {
	logger: Logger;
	networkIdentifier: Buffer;
	getAPIContext: () => ImmutableAPIContext;
	getStore: (moduleID: number, storePrefix: number) => ImmutableSubStore;
	header: BlockHeader;
	assets: BlockAssets;
}

export interface BlockExecuteContext {
	logger: Logger;
	networkIdentifier: Buffer;
	eventQueue: EventQueueAdder;
	getAPIContext: () => APIContext;
	getStore: (moduleID: number, storePrefix: number) => SubStore;
	header: BlockHeader;
	assets: BlockAssets;
}

export interface BlockAfterExecuteContext extends BlockExecuteContext {
	transactions: ReadonlyArray<Transaction>;
}
