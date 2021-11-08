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
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { DEFAULT_MIN_REMAINING_BALANCE } from './constants';
import { TransferCommand } from './commands/transfer';
import { BaseModule, ModuleInitArgs } from '../base_module';
import { GenesisBlockExecuteContext } from '../../node/state_machine';
import { configSchema } from './schemas';
import { TokenAPI } from './api';
import { TokenEndpoint } from './endpoint';

export class TokenModule extends BaseModule {
	public name = 'token';
	public id = 2;
	public api = new TokenAPI(this.id);
	public endpoint = new TokenEndpoint(this.id);

	private _minBalance!: bigint;
	private readonly _transferCommand = new TransferCommand(this.id);

	// eslint-disable-next-line @typescript-eslint/member-ordering
	public commands = [this._transferCommand];

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs) {
		const { moduleConfig } = args;
		const errors = validator.validate(configSchema, moduleConfig);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		this._minBalance = BigInt(moduleConfig?.minBalance) ?? BigInt(DEFAULT_MIN_REMAINING_BALANCE);
		this.api.init({ minBalance: this._minBalance });
		this._transferCommand.init({
			api: this.api,
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async afterGenesisBlockExecute(_context: GenesisBlockExecuteContext): Promise<void> {}
}
