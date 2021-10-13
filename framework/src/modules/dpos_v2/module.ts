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

import {
	GenesisBlockExecuteContext,
	BlockAfterExecuteContext,
} from '../../node/state_machine/types';
import { BaseModule, ModuleInitArgs } from '../base_module';
import { ModuleConfig } from '../fee/types';
import { DPoSAPI } from './api';
import { DelegateRegistrationCommand } from './commands/delegate_registration';
import { ReportDelegateMisbehaviorCommand } from './commands/pom';
import { UnlockCommand } from './commands/unlock';
import { UpdateGeneratorKeyCommand } from './commands/update_generator_key';
import { VoteCommand } from './commands/vote';
import { MODULE_ID_DPOS, COMMAND_ID_UPDATE_GENERATOR_KEY } from './constants';
import { DPoSEndpoint } from './endpoint';
import { configSchema } from './schemas';
import { BFTAPI, RandomAPI, ValidatorsAPI } from './types';

export class DPoSModule extends BaseModule {
	public id = MODULE_ID_DPOS;
	public name = 'dpos';
	public api = new DPoSAPI(this.id);
	public endpoint = new DPoSEndpoint(this.id);
	public configSchema = configSchema;
	public commands = [
		new DelegateRegistrationCommand(this.id),
		new ReportDelegateMisbehaviorCommand(this.id),
		new UnlockCommand(this.id),
		new UpdateGeneratorKeyCommand(this.id),
		new VoteCommand(this.id),
	];

	private _randomAPI!: RandomAPI;
	private _bftAPI!: BFTAPI;
	private _validatorsAPI!: ValidatorsAPI;
	private _moduleConfig!: ModuleConfig;

	public addDependencies(randomAPI: RandomAPI, bftAPI: BFTAPI, validatorsAPI: ValidatorsAPI) {
		this._bftAPI = bftAPI;
		this._randomAPI = randomAPI;
		this._validatorsAPI = validatorsAPI;
		const updateGeneratorKeyCommand = this.commands.find(
			command => command.id === COMMAND_ID_UPDATE_GENERATOR_KEY,
		) as UpdateGeneratorKeyCommand | undefined;

		if (!updateGeneratorKeyCommand) {
			throw Error("'updateGeneratorKeyCommand' is missing from DPoS module");
		}
		updateGeneratorKeyCommand.addDependencies(this._validatorsAPI);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs) {
		const { moduleConfig } = args;
		this._moduleConfig = (moduleConfig as unknown) as ModuleConfig;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async afterGenesisBlockExecute(_context: GenesisBlockExecuteContext): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(this._bftAPI, this._randomAPI, this._validatorsAPI, this._moduleConfig);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async afterBlockExecute(_context: BlockAfterExecuteContext): Promise<void> {}
}
