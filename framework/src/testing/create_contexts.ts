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

import { Block, GenesisBlock, Transaction } from '@liskhq/lisk-chain';
import {
	AfterBlockApplyContext,
	AfterGenesisBlockApplyContext,
	ApplyAssetContext,
	BeforeBlockApplyContext,
	Consensus,
	ReducerHandler,
	StateStore,
	TransactionApplyContext,
	ValidateAssetContext,
} from '../types';
import { ModuleClass } from './types';
import { consensusMock, reducerHandlerMock, StateStoreMock } from './mocks';
import { createGenesisBlock } from './create_genesis_block';

export const createAfterGenesisBlockApplyContext = <T = unknown>(params: {
	modules?: ModuleClass[];
	genesisBlock?: GenesisBlock<T>;
	reducerHandler?: ReducerHandler;
	stateStore?: StateStore;
}): AfterGenesisBlockApplyContext<T> => {
	const modules = params.modules ?? [];
	const genesisBlock = params.genesisBlock ?? createGenesisBlock<T>({ modules }).genesisBlock;
	const stateStore = params.stateStore ?? new StateStoreMock();
	const reducerHandler = params.reducerHandler ?? reducerHandlerMock;

	return { genesisBlock, stateStore, reducerHandler };
};

export const createBeforeBlockApplyContext = (params: {
	block: Block;
	reducerHandler?: ReducerHandler;
	stateStore?: StateStore;
}): BeforeBlockApplyContext => {
	const stateStore = params.stateStore ?? new StateStoreMock();
	const reducerHandler = params.reducerHandler ?? reducerHandlerMock;

	return { block: params.block, stateStore, reducerHandler };
};

export const createAfterBlockApplyContext = (params: {
	block: Block;
	reducerHandler?: ReducerHandler;
	stateStore?: StateStore;
	consensus?: Consensus;
}): AfterBlockApplyContext => {
	const consensus = params.consensus ?? consensusMock;
	const stateStore = params.stateStore ?? new StateStoreMock();
	const reducerHandler = params.reducerHandler ?? reducerHandlerMock;

	return { block: params.block, stateStore, reducerHandler, consensus };
};

export const createTransactionApplyContext = (params: {
	transaction: Transaction;
	reducerHandler?: ReducerHandler;
	stateStore?: StateStore;
}): TransactionApplyContext => {
	const stateStore = params.stateStore ?? new StateStoreMock();
	const reducerHandler = params.reducerHandler ?? reducerHandlerMock;

	return { transaction: params.transaction, stateStore, reducerHandler };
};

export const createApplyAssetContext = <T>(params: {
	transaction: Transaction;
	asset: T;
	reducerHandler?: ReducerHandler;
	stateStore?: StateStore;
}): ApplyAssetContext<T> => {
	const stateStore = params.stateStore ?? new StateStoreMock();
	const reducerHandler = params.reducerHandler ?? reducerHandlerMock;

	return { transaction: params.transaction, stateStore, reducerHandler, asset: params.asset };
};

export const createValidateAssetContext = <T>(params: {
	transaction: Transaction;
	asset: T;
}): ValidateAssetContext<T> => ({ transaction: params.transaction, asset: params.asset });
