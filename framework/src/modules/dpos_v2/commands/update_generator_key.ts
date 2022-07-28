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

import { validator } from '@liskhq/lisk-validator';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import {
	COMMAND_ID_UPDATE_GENERATOR_KEY,
	MODULE_ID_DPOS_BUFFER,
	STORE_PREFIX_DELEGATE,
} from '../constants';
import { updateGeneratorKeyCommandParamsSchema } from '../schemas';
import { UpdateGeneratorKeyParams, ValidatorsAPI } from '../types';
import { getIDAsKeyForStore } from '../utils';

export class UpdateGeneratorKeyCommand extends BaseCommand {
	public id = getIDAsKeyForStore(COMMAND_ID_UPDATE_GENERATOR_KEY);
	public name = 'updateGeneratorKey';
	public schema = updateGeneratorKeyCommandParamsSchema;
	private _validatorsAPI!: ValidatorsAPI;

	public addDependencies(validatorsAPI: ValidatorsAPI) {
		this._validatorsAPI = validatorsAPI;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<UpdateGeneratorKeyParams>,
	): Promise<VerificationResult> {
		const { transaction } = context;

		try {
			validator.validate(updateGeneratorKeyCommandParamsSchema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		const delegateSubstore = context.getStore(MODULE_ID_DPOS_BUFFER, STORE_PREFIX_DELEGATE);
		const entryExists = await delegateSubstore.has(transaction.senderAddress);

		if (!entryExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Delegate substore must have an entry for the store key address'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<UpdateGeneratorKeyParams>): Promise<void> {
		const { transaction } = context;
		const apiContext = context.getAPIContext();

		await this._validatorsAPI.setValidatorGeneratorKey(
			apiContext,
			transaction.senderAddress,
			context.params.generatorKey,
		);
	}
}
