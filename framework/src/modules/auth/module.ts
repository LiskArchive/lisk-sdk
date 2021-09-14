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

import { BaseModule } from '..';
import {
	TransactionExecuteContext,
	TransactionVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../node/state_machine';
import { AuthAPI } from './api';
import { RegisterMultisignitureCommand } from './commands/register_multisigniture';
import { MODULE_ID_AUTH } from './constants';
import { AuthEndpoint } from './endpoint';
import { configSchema } from './schemas';

export class AuthModule extends BaseModule {
	public id = MODULE_ID_AUTH;
	public name = 'auth';
	public api = new AuthAPI(this.id);
	public endpoint = new AuthEndpoint(this.id);
	public configSchema = configSchema;
	public commands = [new RegisterMultisignitureCommand()];

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verifyTransaction(_context: TransactionVerifyContext): Promise<VerificationResult> {
		return {
			status: VerifyStatus.OK,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async beforeTransactionExecute(_context: TransactionExecuteContext): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async afterTransactionExecute(_context: TransactionExecuteContext): Promise<void> {}
}
