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
import { apiClient } from '@liskhq/lisk-client';
import { Block, Transaction } from '../types';

const MAX_BLOCKS = 103 * 3;
const MAX_TRANSACTIONS = 150;

export const updateStatesOnNewBlock = (
	client: apiClient.APIClient,
	newBlockStr: string,
	blocks: Block[],
	confirmedTransactions: Transaction[],
	unconfirmedTransactions: Transaction[],
): {
	blocks: Block[];
	confirmedTransactions: Transaction[];
	unconfirmedTransactions: Transaction[];
} => {
	const newBlock = client.block.toJSON(client.block.decode(newBlockStr));
	const newBlocks = [...blocks, newBlock].slice(-1 * MAX_BLOCKS) as Block[];
	console.info({ newBlocks, blocks });

	for (const trs of ((newBlock as unknown) as Block).payload) {
		confirmedTransactions.push(trs);
	}
	const confirmedTransactionsIds = confirmedTransactions.map(t => t.id);
	const newUnconfirmedTransactions = unconfirmedTransactions
		.filter(t => !confirmedTransactionsIds.includes(t.id))
		.slice(-1 * MAX_TRANSACTIONS);

	const newConfirmedTransactions = confirmedTransactions.slice(-1 * MAX_TRANSACTIONS);

	return {
		blocks: newBlocks,
		confirmedTransactions: newConfirmedTransactions,
		unconfirmedTransactions: newUnconfirmedTransactions,
	};
};

export const updateStatesOnNewTransaction = (
	client: apiClient.APIClient,
	newTransactionStr: string,
	unconfirmedTransactions: Transaction[],
): Transaction[] => {
	const transaction = client.transaction.toJSON(client.transaction.decode(newTransactionStr));
	return [...unconfirmedTransactions, transaction].slice(-1 * MAX_TRANSACTIONS) as Transaction[];
};
