/*
 * Copyright © 2023 Lisk Foundation
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

import { BaseCommand } from '../../base_command';
import { updateGeneratorKeySchema } from '../schemas';
import { COMMAND_UPDATE_KEY } from '../constants';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { UpdateGeneratorKeyParams, ValidatorsMethod } from '../types';
import { ValidatorStore } from '../stores';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0047.md#update-generator-key-command
export class UpdateGeneratorKeyCommand extends BaseCommand {
	public schema = updateGeneratorKeySchema;
	private _validatorsMethod!: ValidatorsMethod;

	public get name(): string {
		return COMMAND_UPDATE_KEY;
	}

	public addDependencies(validatorsMethod: ValidatorsMethod) {
		this._validatorsMethod = validatorsMethod;
	}

	public async verify(
		context: CommandVerifyContext<UpdateGeneratorKeyParams>,
	): Promise<VerificationResult> {
		const validatorExists = await this.stores
			.get(ValidatorStore)
			.has(context, context.transaction.senderAddress);
		if (!validatorExists) {
			throw new Error('Validator does not exist.');
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<UpdateGeneratorKeyParams>): Promise<void> {
		const { generatorKey } = context.params;

		await this._validatorsMethod.setValidatorGeneratorKey(
			context,
			context.transaction.senderAddress,
			generatorKey,
		);
	}
}
