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
import { BaseModule, ModuleInitArgs } from '../base_module';
import { BFTAPI } from './api';
import { BFTEndpoint } from './endpoint';
import { MODULE_ID_BFT } from './constants';
import { bftModuleConfig } from './schemas';
import { BlockAfterExecuteContext, GenesisBlockExecuteContext } from '../../node/state_machine';

export class BFTModule extends BaseModule {
	public id = MODULE_ID_BFT;
	public name = 'bft';
	public api = new BFTAPI(this.id);
	public endpoint = new BFTEndpoint(this.id);

	private _batchSize!: number;
	private _maxLengthBlockBFTInfos!: number;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const errors = validator.validate(bftModuleConfig, moduleConfig);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		this._batchSize = moduleConfig.batchSize as number;
		this._maxLengthBlockBFTInfos = 3 * this._batchSize;
		// eslint-disable-next-line no-console
		console.log(this._maxLengthBlockBFTInfos);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async afterGenesisBlockExecute(_context: GenesisBlockExecuteContext): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async afterBlockExecute(_context: BlockAfterExecuteContext): Promise<void> {}
}
