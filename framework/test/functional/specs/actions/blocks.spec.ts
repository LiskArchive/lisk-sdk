/*
 * Copyright © 2020 Lisk Foundation
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

import { TransferTransaction } from '@liskhq/lisk-transactions';
import {
	createApplication,
	closeApplication,
	sendTransaction,
	waitNBlocks,
} from '../../utils/application';
import { Application } from '../../../../src';

describe('Block related actions', () => {
	let app: Application;
	let sentTx: TransferTransaction;

	beforeAll(async () => {
		app = await createApplication('actions-blocks');
		sentTx = await sendTransaction(app);
		await waitNBlocks(app, 1);
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('getBlockByID', () => {
		it('should return valid encoded block', async () => {
			const encodedBlock = await app['_channel'].invoke('app:getBlockByID', {
				id: app['_node']['_chain'].genesisBlock.header.id.toString('base64'),
			});
			expect(encodedBlock).toBeString();
			const block = app['_node']['_chain'].dataAccess.decode(
				Buffer.from(encodedBlock as string, 'base64'),
			);
			expect(block.header.height).toEqual(1);
		});
	});

	describe('getBlocksByIDs', () => {
		it('should return valid encoded blocks', async () => {
			const encodedBlocks: string[] = await app[
				'_channel'
			].invoke('app:getBlocksByIDs', {
				ids: [
					app['_node']['_chain'].genesisBlock.header.id.toString('base64'),
					app['_node']['_chain'].lastBlock.header.id.toString('base64'),
				],
			});
			expect(encodedBlocks).toHaveLength(2);
			const block = app['_node']['_chain'].dataAccess.decode(
				Buffer.from(encodedBlocks[0], 'base64'),
			);
			expect(block.header.height).toEqual(1);
		});
	});

	describe('getBlockByHeight', () => {
		it('should return valid encoded block', async () => {
			const encodedBlock = await app['_channel'].invoke(
				'app:getBlockByHeight',
				{ height: 2 },
			);
			expect(encodedBlock).toBeString();
			const block = app['_node']['_chain'].dataAccess.decode(
				Buffer.from(encodedBlock as string, 'base64'),
			);
			expect(block.header.height).toEqual(2);
		});
	});

	describe('getBlocksByHeightBetween', () => {
		it('should return valid encoded blocks', async () => {
			const encodedBlocks: string[] = await app[
				'_channel'
			].invoke('app:getBlocksByHeightBetween', { from: 1, to: 2 });
			expect(encodedBlocks).toHaveLength(2);
			const block = app['_node']['_chain'].dataAccess.decode(
				Buffer.from(encodedBlocks[0], 'base64'),
			);
			expect(block.header.height).toEqual(2);
		});
	});

	describe('getTransactionByID', () => {
		it('should return valid encoded transaction', async () => {
			const encodedTx = await app['_channel'].invoke('app:getTransactionByID', {
				id: sentTx.id.toString('base64'),
			});
			expect(encodedTx).toBeString();
			const tx = app['_node']['_chain'].dataAccess.decodeTransaction(
				Buffer.from(encodedTx as string, 'base64'),
			);
			expect(tx.senderPublicKey).toEqual(sentTx.senderPublicKey);
		});
	});

	describe('getTransactionsByIDs', () => {
		it('should return valid encoded transactions', async () => {
			const encodedTxs: string[] = await app[
				'_channel'
			].invoke('app:getTransactionsByIDs', {
				ids: [sentTx.id.toString('base64')],
			});
			expect(encodedTxs).toHaveLength(1);
			const tx = app['_node']['_chain'].dataAccess.decodeTransaction(
				Buffer.from(encodedTxs[0], 'base64'),
			);
			expect(tx.senderPublicKey).toEqual(sentTx.senderPublicKey);
		});
	});
});
