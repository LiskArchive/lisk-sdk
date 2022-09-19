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
 *
 */

import { BlockAssets, BlockHeader, StateStore, Transaction } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { InMemoryDatabase } from '@liskhq/lisk-db';
import { ModuleEndpointContext } from '../types';
import { Logger } from '../logger';
import {
	MethodContext,
	BlockContext,
	createMethodContext,
	createImmutableMethodContext,
	EventQueue,
	GenesisBlockContext,
	ImmutableSubStore,
	InsertAssetContext,
	TransactionContext,
} from '../state_machine';
import { loggerMock } from './mocks';
import { WritableBlockAssets } from '../engine/generator/types';
import { Validator } from '../abi';
import { SubStore } from '../state_machine/types';
import { PrefixedStateReadWriter } from '../state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from './in_memory_prefixed_state';
import {
	BeforeApplyCCMsgMethodContext,
	BeforeRecoverCCMsgMethodContext,
	BeforeSendCCMsgMethodContext,
	CCCommandExecuteContext,
	CCMsg,
	CCUpdateParams,
	RecoverCCMsgMethodContext,
} from '../modules/interoperability/types';
import { getIDAsKeyForStore } from './utils';
import { getCCMSize } from '../modules/interoperability/utils';

const createTestHeader = () =>
	new BlockHeader({
		height: 0,
		generatorAddress: utils.getRandomBytes(20),
		previousBlockID: Buffer.alloc(0),
		timestamp: Math.floor(Date.now() / 1000),
		version: 0,
		transactionRoot: utils.hash(Buffer.alloc(0)),
		stateRoot: utils.hash(Buffer.alloc(0)),
		maxHeightGenerated: 0,
		maxHeightPrevoted: 0,
		assetRoot: utils.hash(Buffer.alloc(0)),
		aggregateCommit: {
			height: 0,
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
		},
		validatorsHash: utils.hash(Buffer.alloc(0)),
	});

export const createGenesisBlockContext = (params: {
	header?: BlockHeader;
	stateStore?: PrefixedStateReadWriter;
	eventQueue?: EventQueue;
	assets?: BlockAssets;
	logger?: Logger;
}): GenesisBlockContext => {
	const logger = params.logger ?? loggerMock;
	const stateStore =
		params.stateStore ?? new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
	const eventQueue = params.eventQueue ?? new EventQueue(params.header ? params.header.height : 0);
	const header = params.header ?? createTestHeader();
	const ctx = new GenesisBlockContext({
		eventQueue,
		stateStore,
		header,
		assets: params.assets ?? new BlockAssets(),
		logger,
	});
	return ctx;
};

export const createBlockContext = (params: {
	stateStore?: PrefixedStateReadWriter;
	eventQueue?: EventQueue;
	logger?: Logger;
	header?: BlockHeader;
	assets?: BlockAssets;
	transactions?: Transaction[];
	validators?: Validator[];
}): BlockContext => {
	const logger = params.logger ?? loggerMock;
	const stateStore =
		params.stateStore ?? new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
	const eventQueue = params.eventQueue ?? new EventQueue(params.header ? params.header.height : 0);
	const header = params.header ?? createTestHeader();
	const ctx = new BlockContext({
		stateStore,
		logger,
		eventQueue,
		transactions: params.transactions ?? [],
		header,
		assets: params.assets ?? new BlockAssets(),
		chainID: utils.getRandomBytes(32),
		currentValidators: params.validators ?? [],
		impliesMaxPrevote: true,
		maxHeightCertified: 0,
		certificateThreshold: params.validators
			? (BigInt(2) * BigInt(params.validators.length)) / BigInt(3) + BigInt(1)
			: BigInt(0),
	});
	return ctx;
};

export const createBlockGenerateContext = (params: {
	assets?: WritableBlockAssets;
	getOffchainStore?: (moduleID: Buffer, subStorePrefix: Buffer) => SubStore;
	logger?: Logger;
	getMethodContext?: () => MethodContext;
	getStore?: (moduleID: Buffer, storePrefix: Buffer) => ImmutableSubStore;
	header: BlockHeader;
	finalizedHeight?: number;
	chainID?: Buffer;
}): InsertAssetContext => {
	const db = new InMemoryDatabase();
	const generatorStore = new StateStore(db);
	const getOffchainStore = (moduleID: Buffer, subStorePrefix: Buffer) =>
		generatorStore.getStore(moduleID, subStorePrefix);
	const header = params.header ?? createTestHeader();
	const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
	const getStore = (moduleID: Buffer, storePrefix: Buffer) =>
		stateStore.getStore(moduleID, storePrefix);

	const ctx: InsertAssetContext = {
		assets: params.assets ?? new BlockAssets([]),
		getOffchainStore: params.getOffchainStore ?? getOffchainStore,
		logger: params.logger ?? loggerMock,
		chainID: params.chainID ?? utils.getRandomBytes(32),
		getMethodContext:
			params.getMethodContext ??
			(() => ({ getStore, eventQueue: new EventQueue(params.header ? params.header.height : 0) })),
		getStore: params.getStore ?? getStore,
		getFinalizedHeight: () => params.finalizedHeight ?? 0,
		header,
	};

	return ctx;
};

export const createTransactionContext = (params: {
	stateStore?: PrefixedStateReadWriter;
	eventQueue?: EventQueue;
	logger?: Logger;
	header?: BlockHeader;
	assets?: BlockAssets;
	chainID?: Buffer;
	currentValidators?: Validator[];
	impliesMaxPrevote?: boolean;
	maxHeightCertified?: number;
	certificateThreshold?: bigint;
	transaction: Transaction;
}): TransactionContext => {
	const logger = params.logger ?? loggerMock;
	const stateStore =
		params.stateStore ?? new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
	const eventQueue = params.eventQueue ?? new EventQueue(params.header ? params.header.height : 0);
	const header = params.header ?? createTestHeader();
	const ctx = new TransactionContext({
		stateStore,
		logger,
		eventQueue,
		header,
		assets: params.assets ?? new BlockAssets(),
		chainID: params.chainID ?? utils.getRandomBytes(32),
		transaction: params.transaction,
		currentValidators: params.currentValidators ?? [],
		impliesMaxPrevote: params.impliesMaxPrevote ?? true,
		maxHeightCertified: params.maxHeightCertified ?? 0,
		certificateThreshold: params.certificateThreshold ?? BigInt(0),
	});
	return ctx;
};

export const createTransientMethodContext = (params: {
	stateStore?: PrefixedStateReadWriter;
	eventQueue?: EventQueue;
}): MethodContext => {
	const stateStore =
		params.stateStore ?? new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
	const eventQueue = params.eventQueue ?? new EventQueue(0);
	const ctx = createMethodContext({ stateStore, eventQueue });
	return ctx;
};

export const createTransientModuleEndpointContext = (params: {
	stateStore?: PrefixedStateReadWriter;
	moduleStore?: StateStore;
	params?: Record<string, unknown>;
	logger?: Logger;
	chainID?: Buffer;
}): ModuleEndpointContext => {
	const stateStore =
		params.stateStore ?? new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
	const moduleStore = params.moduleStore ?? new StateStore(new InMemoryDatabase());
	const parameters = params.params ?? {};
	const logger = params.logger ?? loggerMock;
	const chainID = params.chainID ?? Buffer.alloc(0);
	const ctx = {
		getStore: (moduleID: Buffer, storePrefix: Buffer) => stateStore.getStore(moduleID, storePrefix),
		getOffchainStore: (moduleID: Buffer, storePrefix: Buffer) =>
			moduleStore.getStore(moduleID, storePrefix),
		getImmutableMethodContext: () => createImmutableMethodContext(stateStore),
		params: parameters,
		logger,
		chainID,
	};
	return ctx;
};

const createCCMethodContext = (params: {
	stateStore?: PrefixedStateReadWriter;
	logger?: Logger;
	chainID?: Buffer;
	getMethodContext?: () => MethodContext;
	eventQueue?: EventQueue;
	ccm?: CCMsg;
	feeAddress?: Buffer;
}) => {
	const stateStore =
		params.stateStore ?? new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
	const logger = params.logger ?? loggerMock;
	const chainID = params.chainID ?? Buffer.alloc(0);
	const eventQueue = params.eventQueue ?? new EventQueue(0);
	const getStore = (moduleID: Buffer, storePrefix: Buffer) =>
		stateStore.getStore(moduleID, storePrefix);
	const ccm = params.ccm ?? {
		nonce: BigInt(0),
		module: 'token',
		crossChainCommand: 'crossChainTransfer',
		sendingChainID: getIDAsKeyForStore(2),
		receivingChainID: getIDAsKeyForStore(3),
		fee: BigInt(20000),
		status: 0,
		params: Buffer.alloc(0),
	};
	return {
		getStore: (moduleID: Buffer, storePrefix: Buffer) => stateStore.getStore(moduleID, storePrefix),
		logger,
		chainID,
		getMethodContext: params.getMethodContext ?? (() => ({ getStore, eventQueue })),
		eventQueue,
		ccm,
		feeAddress: params.feeAddress ?? utils.getRandomBytes(20),
	};
};

export const createExecuteCCMsgMethodContext = (params: {
	ccm?: CCMsg;
	feeAddress?: Buffer;
	logger?: Logger;
	chainID?: Buffer;
	getMethodContext?: () => MethodContext;
	eventQueue?: EventQueue;
}): CCCommandExecuteContext => {
	const context = createCCMethodContext(params);
	return {
		...context,
		ccmSize: getCCMSize(context.ccm),
	};
};

export const createBeforeSendCCMsgMethodContext = (params: {
	ccm?: CCMsg;
	feeAddress: Buffer;
	logger?: Logger;
	chainID?: Buffer;
	getMethodContext?: () => MethodContext;
	eventQueue?: EventQueue;
}): BeforeSendCCMsgMethodContext => createCCMethodContext(params);

export const createBeforeApplyCCMsgMethodContext = (params: {
	ccm: CCMsg;
	ccu: CCUpdateParams;
	payFromAddress: Buffer;
	stateStore?: PrefixedStateReadWriter;
	logger?: Logger;
	chainID?: Buffer;
	getMethodContext?: () => MethodContext;
	eventQueue?: EventQueue;
	feeAddress: Buffer;
	trsSender: Buffer;
}): BeforeApplyCCMsgMethodContext => ({
	...createCCMethodContext(params),
	ccu: params.ccu,
	trsSender: params.trsSender,
});

export const createBeforeRecoverCCMsgMethodContext = (params: {
	ccm: CCMsg;
	trsSender: Buffer;
	stateStore?: PrefixedStateReadWriter;
	logger?: Logger;
	chainID?: Buffer;
	getMethodContext?: () => MethodContext;
	feeAddress: Buffer;
	eventQueue?: EventQueue;
}): BeforeRecoverCCMsgMethodContext => ({
	...createCCMethodContext(params),
	trsSender: params.trsSender,
});

export const createRecoverCCMsgMethodContext = (params: {
	ccm?: CCMsg;
	terminatedChainID: Buffer;
	module: string;
	storePrefix: Buffer;
	storeKey: Buffer;
	storeValue: Buffer;
	stateStore?: PrefixedStateReadWriter;
	logger?: Logger;
	chainID?: Buffer;
	getMethodContext?: () => MethodContext;
	feeAddress: Buffer;
	eventQueue?: EventQueue;
}): RecoverCCMsgMethodContext => ({
	...createCCMethodContext(params),
	terminatedChainID: params.terminatedChainID,
	module: params.module,
	storePrefix: params.storePrefix,
	storeKey: params.storeKey,
	storeValue: params.storeValue,
});
