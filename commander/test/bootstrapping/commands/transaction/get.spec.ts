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
import { transactionSchema } from 'lisk-framework';
import * as apiClient from '@liskhq/lisk-api-client';
import * as Config from '@oclif/config';

import { BaseIPCClientCommand } from '../../../../src/bootstrapping/commands/base_ipc_client';
import * as appUtils from '../../../../src/utils/application';
import {
	createTransferTransaction,
	encodeTransactionFromJSON,
	tokenTransferParamsSchema,
} from '../../../helpers/transactions';
import { GetCommand } from '../../../../src/bootstrapping/commands/transaction/get';
import { getConfig } from '../../../helpers/config';

describe('transaction:get command', () => {
	const commands = [
		{
			moduleID: 2,
			commandID: 0,
			schema: tokenTransferParamsSchema,
		},
	];
	const { id: transactionId, ...transferTransaction } = createTransferTransaction({
		amount: '1',
		fee: '0.2',
		nonce: 1,
		recipientAddress: '0903f4c5cb599a7928aef27e314e98291d1e3888',
	});
	const encodedTransaction = encodeTransactionFromJSON(
		transferTransaction as any,
		transactionSchema,
		commands,
	);

	let stdout: string[];
	let stderr: string[];
	let config: Config.IConfig;
	let getMock: jest.Mock;

	beforeEach(async () => {
		stdout = [];
		stderr = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => stdout.push(val as string) > -1);
		jest.spyOn(process.stderr, 'write').mockImplementation(val => stderr.push(val as string) > -1);
		jest.spyOn(appUtils, 'isApplicationRunning').mockReturnValue(true);
		jest.spyOn(fs, 'existsSync').mockReturnValue(true);
		jest.spyOn(BaseIPCClientCommand.prototype, 'printJSON').mockReturnValue();
		getMock = jest.fn().mockResolvedValue(encodedTransaction);
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
			disconnect: jest.fn(),
			schemas: {
				transaction: transactionSchema,
				commands,
			},
			transaction: {
				get: getMock,
				toJSON: jest.fn().mockReturnValue({
					...transferTransaction,
					id: transactionId,
				}),
			},
		} as never);
	});

	describe('transaction:get', () => {
		it('should throw an error when no arguments are provided.', async () => {
			await expect(GetCommand.run([], config)).rejects.toThrow('Missing 1 required arg:');
		});
	});

	describe('transaction:get {transactionId}', () => {
		it('should get transaction for the given id and display as an object', async () => {
			await GetCommand.run([transactionId as string], config);
			expect(getMock).toHaveBeenCalledWith(Buffer.from(transactionId as string, 'hex'));
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledTimes(1);
			expect(BaseIPCClientCommand.prototype.printJSON).toHaveBeenCalledWith({
				...transferTransaction,
				id: transactionId,
			});
		});
	});
});
