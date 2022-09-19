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
import * as fs from 'fs-extra';
import { join } from 'path';
import { transactionSchema } from 'lisk-framework';
import * as apiClient from '@liskhq/lisk-api-client';
import { when } from 'jest-when';

import * as appUtils from '../../../../src/utils/application';
import {
	createTransferTransaction,
	encodeTransactionFromJSON,
	tokenTransferParamsSchema,
} from '../../../helpers/transactions';
import { SendCommand } from '../../../../src/bootstrapping/commands/transaction/send';
import { getConfig } from '../../../helpers/config';
import { Awaited } from '../../../types';

describe('transaction:send command', () => {
	const transactionsAssetSchemas = [
		{
			module: 'token',
			command: 'transfer',
			schema: tokenTransferParamsSchema,
		},
	];
	const { id: transactionId, ...transferTransaction } = createTransferTransaction({
		amount: '1',
		fee: '0.2',
		nonce: 1,
		recipientAddress: 'lskxpxg4y755b9nr6m7f4gcvtk2mp7yj7p364mzem',
	});
	const encodedTransaction = encodeTransactionFromJSON(
		transferTransaction as any,
		transactionSchema,
		transactionsAssetSchemas,
	);
	const pathToAppPIDFiles = join(__dirname, 'fake_test_app');

	let stdout: string[];
	let stderr: string[];
	let config: Awaited<ReturnType<typeof getConfig>>;
	let invokeMock: jest.Mock;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		invokeMock = jest.fn();
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			invoke: invokeMock,
			schemas: {
				transaction: transactionSchema,
				commands: transactionsAssetSchemas,
			},
		} as never);
	});

	describe('transaction:send', () => {
		it('should throw an error when transaction argument is not provided.', async () => {
			await expect(SendCommand.run([], config)).rejects.toThrow('Missing 1 required arg:');
		});
	});

	describe('transaction:send <hex encoded transaction> --data-path=<path to a not running app>', () => {
		it('should throw an error when the application for the provided path is not running.', async () => {
			jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(false);
			await expect(
				SendCommand.run([encodedTransaction, `--data-path=${pathToAppPIDFiles}`], config),
			).rejects.toThrow(`Application at data path ${pathToAppPIDFiles} is not running.`);
		});
	});

	describe('transaction:send <invalid hex string> --data-path=<path to a not running app>', () => {
		it('should throw error.', async () => {
			await expect(
				SendCommand.run(['%%%%%%', `--data-path=${pathToAppPIDFiles}`], config),
			).rejects.toThrow('The transaction must be provided as a encoded hex string.');
		});
	});

	describe('transaction:send <hex encoded transaction> --data-path=<path to a running app>', () => {
		it('should return the id of the sent transaction', async () => {
			when(invokeMock)
				.calledWith('txpool_postTransaction', { transaction: encodedTransaction })
				.mockResolvedValue({ transactionId });
			await SendCommand.run([encodedTransaction, `--data-path=${pathToAppPIDFiles}`], config);
			expect(invokeMock).toHaveBeenCalledWith('txpool_postTransaction', {
				transaction: encodedTransaction,
			});
			expect(stdout[0]).toContain(
				`Transaction with id: '${transactionId as string}' received by node`,
			);
		});
	});

	describe('transaction:send <hex encoded invalid transaction> --data-path=<path to a not running app>', () => {
		it('should throw error.', async () => {
			when(invokeMock)
				.calledWith('txpool_postTransaction', {
					transaction: 'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
				})
				.mockRejectedValue(
					new Error(
						'Error: Lisk validator found 1 error[s]:\nIncompatible transaction nonce for account: d04699e57c4a3846c988f3c15306796f8eae5c1c, Tx Nonce: 0, Account Nonce: 1',
					),
				);

			await expect(
				SendCommand.run(
					['ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815', `--data-path=${pathToAppPIDFiles}`],
					config,
				),
			).rejects.toThrow(
				'Error: Lisk validator found 1 error[s]:\nIncompatible transaction nonce for account: d04699e57c4a3846c988f3c15306796f8eae5c1c, Tx Nonce: 0, Account Nonce: 1',
			);
		});
	});
});
