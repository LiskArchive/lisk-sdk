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
import { Schema } from '@liskhq/lisk-codec';
import { IterateOptions } from '@liskhq/lisk-db';
import { TransactionVerifyResult } from '../abi';
import { Logger } from '../logger';
import { EventQueue } from './event_queue';

export interface EventQueueAdder {
	add(module: string, name: string, data: Buffer, topics?: Buffer[], noRevert?: boolean): void;
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

export interface ImmutableMethodContext {
	getStore: (moduleID: Buffer, storePrefix: Buffer) => ImmutableSubStore;
}

export interface MethodContext {
	getStore: (moduleID: Buffer, storePrefix: Buffer) => SubStore;
	eventQueue: EventQueue;
}

export enum VerifyStatus {
	FAIL = TransactionVerifyResult.INVALID,
	OK = TransactionVerifyResult.OK,
	PENDING = TransactionVerifyResult.PENDING,
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
	getAsset: (module: string) => Buffer | undefined;
}

export interface WritableBlockAssets extends BlockAssets {
	setAsset: (module: string, value: Buffer) => void;
}

export interface VerificationResult {
	status: VerifyStatus;
	error?: Error;
}
// eventQueue is not present here because event cannot be emitted
export interface TransactionVerifyContext {
	chainID: Buffer;
	logger: Logger;
	transaction: Transaction;
	getMethodContext: () => ImmutableMethodContext;
	getStore: (moduleID: Buffer, storePrefix: Buffer) => ImmutableSubStore;
}

export interface CommandVerifyContext<T = undefined> {
	logger: Logger;
	chainID: Buffer;
	transaction: Transaction; // without decoding params
	params: T;
	getMethodContext: () => ImmutableMethodContext;
	getStore: (moduleID: Buffer, storePrefix: Buffer) => ImmutableSubStore;
}

export interface CommandExecuteContext<T = undefined> {
	logger: Logger;
	chainID: Buffer;
	eventQueue: EventQueue;
	header: BlockHeader;
	assets: BlockAssets;
	currentValidators: Validator[];
	impliesMaxPrevote: boolean;
	maxHeightCertified: number;
	certificateThreshold: bigint;
	transaction: Transaction; // without decoding params
	params: T;
	getMethodContext: () => MethodContext;
	getStore: (moduleID: Buffer, storePrefix: Buffer) => SubStore;
}

export interface GenesisBlockExecuteContext {
	logger: Logger;
	eventQueue: EventQueueAdder;
	getMethodContext: () => MethodContext;
	getStore: (moduleID: Buffer, storePrefix: Buffer) => SubStore;
	header: BlockHeader;
	assets: BlockAssets;
	setNextValidators: (
		preCommitThreshold: bigint,
		certificateThreshold: bigint,
		validators: Validator[],
	) => void;
}

export interface TransactionExecuteContext {
	logger: Logger;
	chainID: Buffer;
	eventQueue: EventQueueAdder;
	getMethodContext: () => MethodContext;
	getStore: (moduleID: Buffer, storePrefix: Buffer) => SubStore;
	header: BlockHeader;
	assets: BlockAssets;
	transaction: Transaction;
	currentValidators: Validator[];
	impliesMaxPrevote: boolean;
	maxHeightCertified: number;
	certificateThreshold: bigint;
}

export interface BlockVerifyContext {
	logger: Logger;
	chainID: Buffer;
	getMethodContext: () => ImmutableMethodContext;
	getStore: (moduleID: Buffer, storePrefix: Buffer) => ImmutableSubStore;
	header: BlockHeader;
	assets: BlockAssets;
}

export interface BlockExecuteContext {
	logger: Logger;
	chainID: Buffer;
	eventQueue: EventQueue;
	getMethodContext: () => MethodContext;
	getStore: (moduleID: Buffer, storePrefix: Buffer) => SubStore;
	header: BlockHeader;
	assets: BlockAssets;
	currentValidators: Validator[];
	impliesMaxPrevote: boolean;
	maxHeightCertified: number;
	certificateThreshold: bigint;
}

export interface Validator {
	address: Buffer;
	bftWeight: bigint;
	generatorKey: Buffer;
	blsKey: Buffer;
}

export interface BlockAfterExecuteContext extends BlockExecuteContext {
	transactions: ReadonlyArray<Transaction>;
	setNextValidators: (
		preCommitThreshold: bigint,
		certificateThreshold: bigint,
		validators: Validator[],
	) => void;
}

export interface InsertAssetContext {
	logger: Logger;
	chainID: Buffer;
	getMethodContext: () => MethodContext;
	getStore: (moduleID: Buffer, storePrefix: Buffer) => ImmutableSubStore;
	header: BlockHeader;
	assets: WritableBlockAssets;
	getOffchainStore: (moduleID: Buffer, storePrefix: Buffer) => SubStore;
	getFinalizedHeight(): number;
}
