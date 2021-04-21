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

const sortByBlockHeight = (a: Block, b: Block) => b.header.height - a.header.height;

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
	const newBlocks = [newBlock, ...blocks].slice(-1 * MAX_BLOCKS) as Block[];
	newBlocks.sort(sortByBlockHeight);

	for (const trs of ((newBlock as unknown) as Block).payload) {
		confirmedTransactions.unshift(trs);
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
	return [transaction, ...unconfirmedTransactions].slice(-1 * MAX_TRANSACTIONS) as Transaction[];
};

export const getApplicationUrl = async () => {
	if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
		return 'ws://localhost:5000/ws';
	}

	const result = ((await fetch('/api/config')).json() as unknown) as { applicationUrl: string };

	return result.applicationUrl;
};
