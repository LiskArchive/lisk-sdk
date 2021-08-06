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

import { BlockHeader, StateStore, Transaction } from '@liskhq/lisk-chain';
import { getRandomBytes, hash } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { Logger } from '../logger';
import {
	APIContext,
	BlockContext,
	EventQueue,
	GenesisBlockContext,
	TransactionContext,
} from '../node/state_machine';
import { loggerMock } from './mocks';

export const createGenesisBlockContext = (params: {
	header?: BlockHeader;
	stateStore?: StateStore;
	eventQueue?: EventQueue;
	logger?: Logger;
}): GenesisBlockContext => {
	const logger = params.logger ?? loggerMock;
	const stateStore = params.stateStore ?? new StateStore(new InMemoryKVStore());
	const eventQueue = params.eventQueue ?? new EventQueue();
	const header =
		params.header ??
		new BlockHeader({
			height: 0,
			assets: [],
			generatorAddress: getRandomBytes(20),
			previousBlockID: Buffer.alloc(0),
			timestamp: Math.floor(Date.now() / 1000),
			version: 0,
			transactionRoot: hash(Buffer.alloc(0)),
			stateRoot: hash(Buffer.alloc(0)),
		});
	const ctx = new GenesisBlockContext({
		eventQueue,
		stateStore,
		header,
		logger,
	});
	return ctx;
};

export const createBlockContext = (params: {
	stateStore?: StateStore;
	eventQueue?: EventQueue;
	logger?: Logger;
	header: BlockHeader;
	transactions?: Transaction[];
}): BlockContext => {
	const logger = params.logger ?? loggerMock;
	const stateStore = params.stateStore ?? new StateStore(new InMemoryKVStore());
	const eventQueue = params.eventQueue ?? new EventQueue();
	const ctx = new BlockContext({
		stateStore,
		logger,
		eventQueue,
		transactions: params.transactions ?? [],
		header: params.header,
		networkIdentifier: getRandomBytes(32),
	});
	return ctx;
};

export const createTransactionContext = (params: {
	stateStore?: StateStore;
	eventQueue?: EventQueue;
	logger?: Logger;
	header?: BlockHeader;
	transaction: Transaction;
}): TransactionContext => {
	const logger = params.logger ?? loggerMock;
	const stateStore = params.stateStore ?? new StateStore(new InMemoryKVStore());
	const eventQueue = params.eventQueue ?? new EventQueue();
	const header =
		params.header ??
		new BlockHeader({
			height: 0,
			assets: [],
			generatorAddress: getRandomBytes(20),
			previousBlockID: Buffer.alloc(0),
			timestamp: Math.floor(Date.now() / 1000),
			version: 0,
			transactionRoot: hash(Buffer.alloc(0)),
			stateRoot: hash(Buffer.alloc(0)),
		});
	const ctx = new TransactionContext({
		stateStore,
		logger,
		eventQueue,
		header,
		networkIdentifier: getRandomBytes(32),
		transaction: params.transaction,
	});
	return ctx;
};

export const createAPIContext = (params: {
	stateStore?: StateStore;
	eventQueue?: EventQueue;
}): APIContext => {
	const stateStore = params.stateStore ?? new StateStore(new InMemoryKVStore());
	const eventQueue = params.eventQueue ?? new EventQueue();
	const ctx = new APIContext({
		stateStore,
		eventQueue,
	});
	return ctx;
};
