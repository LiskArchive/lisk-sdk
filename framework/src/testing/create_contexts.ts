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
import { getRandomBytes, hash } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { ModuleEndpointContext } from '../types';
import { Logger } from '../logger';
import {
	APIContext,
	BlockContext,
	createAPIContext,
	EventQueue,
	GenesisBlockContext,
	ImmutableSubStore,
	TransactionContext,
} from '../node/state_machine';
import { loggerMock } from './mocks';
import { BlockGenerateContext } from '../node/generator';
import { WritableBlockAssets } from '../node/generator/types';
import { GeneratorStore } from '../node/generator/generator_store';
import {
	BeforeApplyCCMsgAPIContext,
	BeforeRecoverCCMsgAPIContext,
	BeforeSendCCMsgAPIContext,
	CCCommandExecuteContext,
	CCMsg,
	CCUpdateParams,
	RecoverCCMsgAPIContext,
} from '../modules/interoperability/types';

export const createGenesisBlockContext = (params: {
	header?: BlockHeader;
	stateStore?: StateStore;
	eventQueue?: EventQueue;
	assets?: BlockAssets;
	logger?: Logger;
}): GenesisBlockContext => {
	const logger = params.logger ?? loggerMock;
	const stateStore = params.stateStore ?? new StateStore(new InMemoryKVStore());
	const eventQueue = params.eventQueue ?? new EventQueue();
	const header =
		params.header ??
		new BlockHeader({
			height: 0,
			generatorAddress: getRandomBytes(20),
			previousBlockID: Buffer.alloc(0),
			timestamp: Math.floor(Date.now() / 1000),
			version: 0,
			transactionRoot: hash(Buffer.alloc(0)),
			stateRoot: hash(Buffer.alloc(0)),
			maxHeightGenerated: 0,
			maxHeightPrevoted: 0,
			assetsRoot: hash(Buffer.alloc(0)),
			aggregateCommit: {
				height: 0,
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
			},
			validatorsHash: hash(Buffer.alloc(0)),
		});
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
	stateStore?: StateStore;
	eventQueue?: EventQueue;
	logger?: Logger;
	header?: BlockHeader;
	assets?: BlockAssets;
	transactions?: Transaction[];
}): BlockContext => {
	const logger = params.logger ?? loggerMock;
	const stateStore = params.stateStore ?? new StateStore(new InMemoryKVStore());
	const eventQueue = params.eventQueue ?? new EventQueue();
	const header =
		params.header ??
		new BlockHeader({
			height: 0,
			generatorAddress: getRandomBytes(20),
			previousBlockID: Buffer.alloc(0),
			timestamp: Math.floor(Date.now() / 1000),
			version: 0,
			transactionRoot: hash(Buffer.alloc(0)),
			stateRoot: hash(Buffer.alloc(0)),
			maxHeightGenerated: 0,
			maxHeightPrevoted: 0,
			assetsRoot: hash(Buffer.alloc(0)),
			aggregateCommit: {
				height: 0,
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
			},
			validatorsHash: hash(Buffer.alloc(0)),
		});
	const ctx = new BlockContext({
		stateStore,
		logger,
		eventQueue,
		transactions: params.transactions ?? [],
		header,
		assets: params.assets ?? new BlockAssets(),
		networkIdentifier: getRandomBytes(32),
	});
	return ctx;
};

export const createBlockGenerateContext = (params: {
	assets?: WritableBlockAssets;
	getGeneratorStore?: (moduleID: number) => GeneratorStore;
	logger?: Logger;
	getAPIContext?: () => APIContext;
	getStore?: (moduleID: number, storePrefix: number) => ImmutableSubStore;
	header: BlockHeader;
	finalizedHeight?: number;
	networkIdentifier?: Buffer;
}): BlockGenerateContext => {
	const db = new InMemoryKVStore();
	const generatorStore = new GeneratorStore(db);
	const getGeneratorStore = (moduleID: number) => generatorStore.getGeneratorStore(moduleID);
	const header =
		params.header ??
		new BlockHeader({
			height: 0,
			generatorAddress: getRandomBytes(20),
			previousBlockID: Buffer.alloc(0),
			timestamp: Math.floor(Date.now() / 1000),
			version: 0,
			transactionRoot: hash(Buffer.alloc(0)),
			stateRoot: hash(Buffer.alloc(0)),
			maxHeightGenerated: 0,
			maxHeightPrevoted: 0,
			assetsRoot: hash(Buffer.alloc(0)),
			aggregateCommit: {
				height: 0,
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
			},
			validatorsHash: hash(Buffer.alloc(0)),
		});
	const stateStoreDB = new InMemoryKVStore();
	const stateStore = new StateStore(stateStoreDB);
	const getStore = (moduleID: number, storePrefix: number) =>
		stateStore.getStore(moduleID, storePrefix);

	const ctx: BlockGenerateContext = {
		assets: params.assets ?? new BlockAssets([]),
		getGeneratorStore: params.getGeneratorStore ?? getGeneratorStore,
		logger: params.logger ?? loggerMock,
		networkIdentifier: params.networkIdentifier ?? getRandomBytes(32),
		getAPIContext: params.getAPIContext ?? (() => ({ getStore, eventQueue: new EventQueue() })),
		getStore: params.getStore ?? getStore,
		getFinalizedHeight: () => params.finalizedHeight ?? 0,
		header,
	};

	return ctx;
};

export const createTransactionContext = (params: {
	stateStore?: StateStore;
	eventQueue?: EventQueue;
	logger?: Logger;
	header?: BlockHeader;
	assets?: BlockAssets;
	networkIdentifier?: Buffer;
	transaction: Transaction;
}): TransactionContext => {
	const logger = params.logger ?? loggerMock;
	const stateStore = params.stateStore ?? new StateStore(new InMemoryKVStore());
	const eventQueue = params.eventQueue ?? new EventQueue();
	const header =
		params.header ??
		new BlockHeader({
			height: 0,
			generatorAddress: getRandomBytes(20),
			previousBlockID: Buffer.alloc(0),
			timestamp: Math.floor(Date.now() / 1000),
			version: 0,
			transactionRoot: hash(Buffer.alloc(0)),
			stateRoot: hash(Buffer.alloc(0)),
			maxHeightGenerated: 0,
			maxHeightPrevoted: 0,
			assetsRoot: hash(Buffer.alloc(0)),
			aggregateCommit: {
				height: 0,
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
			},
			validatorsHash: hash(Buffer.alloc(0)),
		});
	const ctx = new TransactionContext({
		stateStore,
		logger,
		eventQueue,
		header,
		assets: params.assets ?? new BlockAssets(),
		networkIdentifier: params.networkIdentifier ?? getRandomBytes(32),
		transaction: params.transaction,
	});
	return ctx;
};

export const createTransientAPIContext = (params: {
	stateStore?: StateStore;
	eventQueue?: EventQueue;
}): APIContext => {
	const stateStore = params.stateStore ?? new StateStore(new InMemoryKVStore());
	const eventQueue = params.eventQueue ?? new EventQueue();
	const ctx = createAPIContext({ stateStore, eventQueue });
	return ctx;
};

export const createTransientModuleEndpointContext = (params: {
	stateStore?: StateStore;
	params?: Record<string, unknown>;
	logger?: Logger;
	networkIdentifier?: Buffer;
}): ModuleEndpointContext => {
	const stateStore = params.stateStore ?? new StateStore(new InMemoryKVStore());
	const parameters = params.params ?? {};
	const logger = params.logger ?? loggerMock;
	const networkIdentifier = params.networkIdentifier ?? Buffer.alloc(0);
	const ctx = {
		getStore: (moduleID: number, storePrefix: number) => stateStore.getStore(moduleID, storePrefix),
		params: parameters,
		logger,
		networkIdentifier,
	};
	return ctx;
};

const createCCAPIContext = (params: {
	stateStore?: StateStore;
	logger?: Logger;
	networkIdentifier?: Buffer;
	getAPIContext?: () => APIContext;
	eventQueue?: EventQueue;
	ccm?: CCMsg;
	feeAddress?: Buffer;
}) => {
	const stateStore = params.stateStore ?? new StateStore(new InMemoryKVStore());
	const logger = params.logger ?? loggerMock;
	const networkIdentifier = params.networkIdentifier ?? Buffer.alloc(0);
	const eventQueue = params.eventQueue ?? new EventQueue();
	const getStore = (moduleID: number, storePrefix: number) =>
		stateStore.getStore(moduleID, storePrefix);
	const ccm = params.ccm ?? {
		nonce: BigInt(0),
		moduleID: 1,
		crossChainCommandID: 1,
		sendingChainID: 2,
		receivingChainID: 3,
		fee: BigInt(20000),
		status: 0,
		params: Buffer.alloc(0),
	};
	return {
		getStore: (moduleID: number, storePrefix: number) => stateStore.getStore(moduleID, storePrefix),
		logger,
		networkIdentifier,
		getAPIContext: params.getAPIContext ?? (() => ({ getStore, eventQueue })),
		eventQueue,
		ccm,
		feeAddress: params.feeAddress ?? getRandomBytes(20),
	};
};

export const createExecuteCCMsgAPIContext = (params: {
	ccm?: CCMsg;
	feeAddress?: Buffer;
	logger?: Logger;
	networkIdentifier?: Buffer;
	getAPIContext?: () => APIContext;
	eventQueue?: EventQueue;
}): CCCommandExecuteContext => createCCAPIContext(params);

export const createBeforeSendCCMsgAPIContext = (params: {
	ccm?: CCMsg;
	feeAddress: Buffer;
	logger?: Logger;
	networkIdentifier?: Buffer;
	getAPIContext?: () => APIContext;
	eventQueue?: EventQueue;
}): BeforeSendCCMsgAPIContext => createCCAPIContext(params);

export const createBeforeApplyCCMsgAPIContext = (params: {
	ccm: CCMsg;
	ccu: CCUpdateParams;
	payFromAddress: Buffer;
	stateStore?: StateStore;
	logger?: Logger;
	networkIdentifier?: Buffer;
	getAPIContext?: () => APIContext;
	eventQueue?: EventQueue;
	feeAddress: Buffer;
}): BeforeApplyCCMsgAPIContext => ({
	...createCCAPIContext(params),
	ccu: params.ccu,
});

export const createBeforeRecoverCCMsgAPIContext = (params: {
	ccm: CCMsg;
	trsSender: Buffer;
	stateStore?: StateStore;
	logger?: Logger;
	networkIdentifier?: Buffer;
	getAPIContext?: () => APIContext;
	feeAddress: Buffer;
	eventQueue?: EventQueue;
}): BeforeRecoverCCMsgAPIContext => ({
	...createCCAPIContext(params),
	trsSender: params.trsSender,
});

export const createRecoverCCMsgAPIContext = (params: {
	ccm?: CCMsg;
	terminatedChainID: number;
	moduleID: number;
	storePrefix: number;
	storeKey: number;
	storeValue: Buffer;
	stateStore?: StateStore;
	logger?: Logger;
	networkIdentifier?: Buffer;
	getAPIContext?: () => APIContext;
	feeAddress: Buffer;
	eventQueue?: EventQueue;
}): RecoverCCMsgAPIContext => ({
	...createCCAPIContext(params),
	terminatedChainID: params.terminatedChainID,
	moduleID: params.moduleID,
	storePrefix: params.storePrefix,
	storeKey: params.storeKey,
	storeValue: params.storeValue,
});
