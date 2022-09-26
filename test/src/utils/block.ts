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
 *
 */
import { apiClient, BlockJSON } from 'lisk-sdk';

interface NewBlockEvent {
	blockHeader: {
		height: number;
	};
}

export const waitForBlock = async (client: apiClient.APIClient, height: number) => {
	let currentBlockHeader: { height: number };

	client.subscribe('chain_newBlock', block => {
		currentBlockHeader = ((block as unknown) as NewBlockEvent).blockHeader;
	});

	await new Promise<void>(resolve => {
		setInterval(() => {
			if (currentBlockHeader && currentBlockHeader.height >= height) {
				resolve();
			}
		}, 100);
	});
};

export const getLastBlock = async (client: apiClient.APIClient) =>
	client.invoke<BlockJSON>('chain_getLastBlock');

export const waitForTransaction = async (client: apiClient.APIClient, txID: string) =>
	new Promise<void>(resolve => {
		client.subscribe('chain_newBlock', async block => {
			const currentBlockHeader = ((block as unknown) as NewBlockEvent).blockHeader;
			const transactions = await client.invoke<{ id: string }[]>('chain_getTransactionsByHeight', {
				height: currentBlockHeader.height,
			});
			for (const tx of transactions) {
				if (tx.id === txID) {
					resolve();
				}
			}
		});
	});
