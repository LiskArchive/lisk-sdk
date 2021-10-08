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

import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../node/state_machine/types';
import { BaseCommand } from '../../base_command';
import { COMMAND_ID_UPDATE_GENERATOR_KEY } from '../constants';
import { updateGeneratorKeyCommandParamsSchema } from '../schemas';
import { UpdateGeneratorKeyParams, ValidatorsAPI } from '../types';

export class UpdateGeneratorKeyCommand extends BaseCommand {
	public id = COMMAND_ID_UPDATE_GENERATOR_KEY;
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
		const errors = validator.validate(updateGeneratorKeyCommandParamsSchema, context.params);

		if (errors.length > 0) {
			return {
				status: VerifyStatus.FAIL,
				error: new LiskValidationError(errors),
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
