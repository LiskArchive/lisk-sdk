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

import { Application } from 'lisk-framework';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

import axios from 'axios';
import {
	closeApplication,
	createApplication,
	getURL,
	callNetwork,
	waitNBlocks,
	waitTill,
} from '../../utils/application';
import { ForgerPlugin } from '../../../src';
import { getRandomAccount } from '../../utils/accounts';
import { createTransferTransaction, createVoteTransaction } from '../../utils/transactions';

const getForgerInfo = async (forgerPluginInstance: ForgerPlugin, generatorPublicKey: string) => {
	const forgerAddress = getAddressFromPublicKey(Buffer.from(generatorPublicKey, 'base64')).toString(
		'base64',
	);
	const forgerInfo = await forgerPluginInstance['_getForgerInfo'](forgerAddress);

	return forgerInfo;
};

describe('Forger Info', () => {
	let app: Application;
	let accountNonce = 0;

	beforeAll(async () => {
		app = await createApplication('transactions');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('New Block', () => {
		it('should save forger info after new block', async () => {
			// Arrange
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];

			// Act
			const result = await axios.get(getURL('/api/blocks/?height=1'));
			const {
				data: {
					data: {
						header: { generatorPublicKey },
					},
				},
			} = result;
			const forgerInfo = await getForgerInfo(forgerPluginInstance, generatorPublicKey);

			// Assert
			expect(forgerInfo).toMatchSnapshot();
		});

		it('should save forger info with received fees if payload included in new block', async () => {
			// Arrange
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
			const account = getRandomAccount();
			const transaction = createTransferTransaction({
				amount: '2',
				recipientAddress: account.address,
				fee: '0.3',
				nonce: accountNonce,
			});
			accountNonce += 1;

			const { id, ...input } = transaction;
			const { response, status } = await callNetwork(
				axios.post(getURL('/api/transactions'), input),
			);
			expect(status).toEqual(200);
			expect(response).toEqual({ data: { transactionId: id }, meta: {} });
			await waitNBlocks(app, 1);

			const { response: getResponse, status: getStatus } = await callNetwork(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				axios.get(getURL(`/api/transactions/${encodeURIComponent(id)}`)),
			);

			expect(getStatus).toEqual(200);
			expect(getResponse).toEqual({ data: transaction, meta: {} });

			const {
				header: { generatorPublicKey },
			} = app['_node']['_chain'].lastBlock;
			const forgerInfo = await getForgerInfo(forgerPluginInstance, generatorPublicKey);

			// Assert
			expect(forgerInfo).toMatchSnapshot();
		});

		it('should save forger info with votes received in new block', async () => {
			// Arrange
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
			const forgingDelegateAddress = forgerPluginInstance['_forgersList'][0].address;
			const transaction = createVoteTransaction({
				amount: '10',
				recipientAddress: forgingDelegateAddress,
				fee: '0.3',
				nonce: accountNonce,
			});
			accountNonce += 1;

			const { id, ...input } = transaction;
			const { response, status } = await callNetwork(
				axios.post(getURL('/api/transactions'), input),
			);
			expect(status).toEqual(200);
			expect(response).toEqual({ data: { transactionId: id }, meta: {} });
			await waitNBlocks(app, 1);

			const { response: getResponse, status: getStatus } = await callNetwork(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				axios.get(getURL(`/api/transactions/${encodeURIComponent(id)}`)),
			);

			expect(getStatus).toEqual(200);
			expect(getResponse).toEqual({ data: transaction, meta: {} });

			const {
				header: { generatorPublicKey },
			} = app['_node']['_chain'].lastBlock;
			const forgerInfo = await getForgerInfo(forgerPluginInstance, generatorPublicKey);

			// Assert
			expect(forgerInfo).toMatchSnapshot();
		});
	});

	describe('Delete Block', () => {
		it('should update forger info after delete block', async () => {
			// Arrange
			const { generatorPublicKey } = app['_node']['_chain'].lastBlock.header;
			const forgerPluginInstance = app['_controller'].plugins[ForgerPlugin.alias];
			// const forgingDelegateAddress = forgerPluginInstance['_forgersList'][0].address;
			await app['_node']['_processor'].deleteLastBlock();

			// Act
			await waitTill(50);
			const forgerInfo = await getForgerInfo(forgerPluginInstance, generatorPublicKey);

			// Asserts
			expect(forgerInfo).toMatchSnapshot();
		});
	});
});
