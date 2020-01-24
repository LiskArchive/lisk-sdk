/*
 * Copyright © 2019 Lisk Foundation
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
import { Status as TransactionStatus } from '@liskhq/lisk-transactions';

import { Storage as StorageAccess } from './data_access';
import { StateStore } from './state_store';
import * as transactionsModule from './transactions';
import {
	BlockInstance,
	BlockJSON,
	ExceptionOptions,
	Storage,
	StorageTransaction,
} from './types';

// tslint:disable-next-line no-magic-numbers
const TRANSACTION_TYPES_VOTE = [3, 11];

export const saveBlock = async (
	storage: Storage,
	blockJSON: BlockJSON,
	tx: StorageTransaction,
): Promise<void> => {
	if (!tx) {
		throw new Error('Block should only be saved in a database tx');
	}
	// If there is already a running transaction use it
	const promises = [storage.entities.Block.create(blockJSON, {}, tx)];

	if (blockJSON.transactions.length) {
		promises.push(
			storage.entities.Transaction.create(blockJSON.transactions, {}, tx),
		);
	}

	return tx.batch(promises);
};

export const deleteLastBlock = async (
	storage: Storage,
	storageAccess: StorageAccess,
	lastBlock: BlockJSON,
): Promise<BlockJSON> => {
	if (lastBlock.height === 1) {
		throw new Error('Cannot delete genesis block');
	}
	const [storageBlock] = await storageAccess.getExtendedBlocksById([
		lastBlock.previousBlockId as string,
	]);

	if (!storageBlock) {
		throw new Error('PreviousBlock is null');
	}

	await storage.entities.Block.delete({ id: lastBlock.id }, {});

	return storageBlock;
};

export const deleteFromBlockId = async (
	storage: Storage,
	storageAccess: StorageAccess,
	blockId: string,
) => {
	const [block] = await storageAccess.getBlockHeadersByIDs([blockId]);

	return storage.entities.Block.delete({
		height_gt: block.height,
	});
};

export const applyConfirmedStep = async (
	blockInstance: BlockInstance,
	stateStore: StateStore,
	exceptions: ExceptionOptions,
) => {
	if (blockInstance.transactions.length <= 0) {
		return;
	}
	const nonInertTransactions = blockInstance.transactions.filter(
		transaction =>
			!transactionsModule.checkIfTransactionIsInert(transaction, exceptions),
	);

	const { transactionsResponses } = await transactionsModule.applyTransactions(
		exceptions,
	)(nonInertTransactions, stateStore);

	const unappliableTransactionsResponse = transactionsResponses.filter(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	if (unappliableTransactionsResponse.length > 0) {
		throw unappliableTransactionsResponse[0].errors;
	}

	await stateStore.finalize();
};

export const applyConfirmedGenesisStep = async (
	blockInstance: BlockInstance,
	stateStore: StateStore,
): Promise<BlockInstance> => {
	blockInstance.transactions.sort(a => {
		if (TRANSACTION_TYPES_VOTE.includes(a.type)) {
			return 1;
		}

		return 0;
	});
	const sortedTransactionInstances = [...blockInstance.transactions];
	await transactionsModule.applyGenesisTransactions()(
		sortedTransactionInstances,
		stateStore,
	);
	await stateStore.finalize();

	return blockInstance;
};

export const undoConfirmedStep = async (
	blockInstance: BlockInstance,
	stateStore: StateStore,
	exceptions: ExceptionOptions,
): Promise<void> => {
	if (blockInstance.transactions.length === 0) {
		return;
	}

	const nonInertTransactions = blockInstance.transactions.filter(
		transaction =>
			!exceptions.inertTransactions ||
			!exceptions.inertTransactions.includes(transaction.id),
	);

	const { transactionsResponses } = await transactionsModule.undoTransactions(
		exceptions,
	)(nonInertTransactions, stateStore);

	const unappliedTransactionResponse = transactionsResponses.find(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK,
	);

	if (unappliedTransactionResponse) {
		throw unappliedTransactionResponse.errors;
	}

	await stateStore.finalize();
};
