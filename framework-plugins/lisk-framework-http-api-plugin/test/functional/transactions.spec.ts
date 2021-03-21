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

import { testing } from 'lisk-framework';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import axios from 'axios';
import {
	callNetwork,
	closeApplicationEnv,
	createApplicationEnv,
	getURL,
} from './utils/application';
import { getRandomAccount } from './utils/accounts';
import { createTransferTransaction } from './utils/transactions';

describe('Hello endpoint', () => {
	// Arrange
	const invalidHexString = '69db1f75ab1f76c69f7dxxxxxxxxxx';
	let appEnv: testing.ApplicationEnv;
	let accountNonce = 0;

	beforeAll(async () => {
		appEnv = createApplicationEnv('transactions');
		await appEnv.startApplication();
	});

	afterAll(async () => {
		await closeApplicationEnv(appEnv);
	});

	describe('GET /api/transactions/:id', () => {
		describe('200 - Success', () => {
			it('should be ok with valid transaction id', async () => {
				const account = getRandomAccount();
				const transaction = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: accountNonce,
					networkIdentifier: appEnv.networkIdentifier,
				});
				accountNonce += 1;

				const { id, ...input } = transaction;
				const { response, status } = await callNetwork(
					axios.post(getURL('/api/transactions'), input),
				);
				expect(status).toEqual(200);
				expect(response).toEqual({ data: { transactionId: id }, meta: {} });
				await appEnv.waitNBlocks(1);

				// Act
				const { response: getResponse, status: getStatus } = await callNetwork(
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					axios.get(getURL(`/api/transactions/${encodeURIComponent(id)}`)),
				);

				// Assert
				expect(getStatus).toEqual(200);
				expect(getResponse).toEqual({ data: transaction, meta: {} });
			});
		});

		describe('400 - Malformed query or parameters', () => {
			it('should fail if id is not valid hex string', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL(`/api/transactions/${invalidHexString}`)),
				);

				expect(status).toEqual(400);
				expect(response).toEqual({
					errors: [{ message: 'Transaction id parameter should be a hex string.' }],
				});
			});
		});

		describe('404 - Not found', () => {
			it('should fail if id is not valid hex string', async () => {
				// Act
				const { response, status } = await callNetwork(
					axios.get(getURL('/api/transactions/d76dda6dc7'), {
						headers: { Accept: 'application/json' },
					}),
				);

				expect(status).toEqual(404);
				expect(response).toEqual({
					errors: [{ message: 'The transaction with id "d76dda6dc7" not found.' }],
				});
			});
		});
	});

	describe('POST /api/transactions', () => {
		describe('200 - Success', () => {
			it('should be ok with valid transaction', async () => {
				// Arrange
				const account = getRandomAccount();
				const transaction = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: accountNonce,
					networkIdentifier: appEnv.networkIdentifier,
				});
				accountNonce += 1;

				const { id, ...input } = transaction;

				// Act
				const { response, status } = await callNetwork(
					axios.post(getURL('/api/transactions'), input),
				);

				// Assert
				expect(status).toEqual(200);
				expect(response).toEqual({ data: { transactionId: id }, meta: {} });
			});
		});

		describe('400 - Malformed query or parameters', () => {
			it('should fail if signatures are missing', async () => {
				// Arrange
				const account = getRandomAccount();
				const transaction = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: accountNonce,
					networkIdentifier: appEnv.networkIdentifier,
				});
				const { id, ...input } = transaction;
				input.signatures = [];

				// Act
				const { response, status } = await callNetwork(
					axios.post(getURL('/api/transactions'), input),
				);

				// Assert
				expect(status).toEqual(400);
				expect(response).toEqual({
					errors: [
						{
							message: 'Lisk validator found 1 error[s]:\nshould NOT have fewer than 1 items',
						},
					],
				});
			});

			it('should fail if senderPublicKey is not hex string', async () => {
				// Arrange
				const account = getRandomAccount();
				const transaction = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: accountNonce,
					networkIdentifier: appEnv.networkIdentifier,
				});
				const { id, ...input } = transaction;
				input.senderPublicKey = invalidHexString;

				// Act
				const { response, status } = await callNetwork(
					axios.post(getURL('/api/transactions'), input),
				);

				// Assert
				expect(status).toEqual(400);
				expect(response).toEqual({
					errors: [
						{
							message:
								'Lisk validator found 1 error[s]:\nProperty \'.senderPublicKey\' should match format "hex"',
						},
					],
				});
			});

			it('should fail if signatures contains invalid hex string', async () => {
				// Arrange
				const account = getRandomAccount();
				const transaction = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: accountNonce,
					networkIdentifier: appEnv.networkIdentifier,
				});
				const { id, ...input } = transaction;
				input.signatures = [invalidHexString];

				// Act
				const { response, status } = await callNetwork(
					axios.post(getURL('/api/transactions'), input),
				);

				// Assert
				expect(status).toEqual(400);
				expect(response).toEqual({
					errors: [
						{
							message: expect.stringContaining("Property '.signatures[0]' should match format"),
						},
					],
				});
			});
		});

		describe('409 - Some error related to processing of request.', () => {
			it('should be pass the static validation but fail while processing of the request when signatures contain empty string', async () => {
				// Arrange
				const account = getRandomAccount();
				const transaction = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: accountNonce,
					networkIdentifier: appEnv.networkIdentifier,
				});
				accountNonce += 1;

				transaction.signatures.push('');

				const { id, ...input } = transaction;

				// Act
				const { response, status } = await callNetwork(
					axios.post(getURL('/api/transactions'), input),
				);

				// Assert
				expect(status).toEqual(409);
				expect(response).toEqual({
					errors: [
						{
							message: expect.stringContaining(
								'Transactions from a single signature account should have exactly one signature',
							),
						},
					],
				});
			});

			it('should fail if signatures are invalid', async () => {
				// Arrange
				const account = getRandomAccount();
				const transaction = createTransferTransaction({
					amount: '2',
					recipientAddress: account.address,
					fee: '0.3',
					nonce: accountNonce,
					networkIdentifier: appEnv.networkIdentifier,
				});
				const { id, ...input } = transaction;
				const newSignature = getRandomBytes(64);
				input.signatures = [newSignature.toString('hex')];

				// Act
				const { response, status } = await callNetwork(
					axios.post(getURL('/api/transactions'), input),
				);

				// Assert
				expect(status).toEqual(409);
				expect(response).toEqual({
					errors: [
						{
							message: expect.stringContaining(
								`Failed to validate signature '${newSignature.toString('hex')}'`,
							),
						},
					],
				});
			});
		});
	});
});
