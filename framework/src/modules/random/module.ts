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

import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { BlockGenerateContext } from '../../node/generator';
import {
	BlockAfterExecuteContext,
	BlockVerifyContext,
	GenesisBlockExecuteContext,
} from '../../node/state_machine';
import { BaseModule, ModuleInitArgs } from '../base_module';
import { RandomAPI } from './api';
import { DEFAULT_MAX_LENGTH_REVEALS, MODULE_ID_RANDOM } from './constants';
import { RandomEndpoint } from './endpoint';
import { randomModuleConfig } from './schemas';
import { ModuleConfig } from './types';

export class RandomModule extends BaseModule {
	public id = MODULE_ID_RANDOM;
	public name = 'random';
	public api = new RandomAPI(this.id);
	public endpoint = new RandomEndpoint(this.id);

	private _maxLengthReveal!: number;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const errors = validator.validate(randomModuleConfig, moduleConfig);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		this._maxLengthReveal =
			(moduleConfig as ModuleConfig).maxLengthRevealsMainchain ?? DEFAULT_MAX_LENGTH_REVEALS;
		// eslint-disable-next-line no-console
		console.log(this._maxLengthReveal);
	}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async initBlock(_context: BlockGenerateContext): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async verifyBlock(_context: BlockVerifyContext): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async afterGenesisBlockExecute(_context: GenesisBlockExecuteContext): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
	public async afterBlockExecute(_context: BlockAfterExecuteContext): Promise<void> {}
}
