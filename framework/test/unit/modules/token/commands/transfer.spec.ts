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

import { TokenAPI } from '../../../../../src/modules/token/api';
import { TransferCommand } from '../../../../../src/modules/token/commands/transfer';

describe('Transfer command', () => {
	let command: TransferCommand;

	beforeEach(() => {
		const moduleID = 2;
		command = new TransferCommand(moduleID);
		const api = new TokenAPI(moduleID);
		command.init({
			api,
		});
	});

	describe('execute', () => {
		it('should execute', async () => {
			await expect(command.execute({} as never)).rejects.toThrow();
		});
	});
});
