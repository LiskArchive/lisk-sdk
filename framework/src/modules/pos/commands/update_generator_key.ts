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
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { updateGeneratorKeyCommandParamsSchema } from '../schemas';
import { ValidatorStore } from '../stores/validator';
import { UpdateGeneratorKeyParams, ValidatorsMethod } from '../types';

export class UpdateGeneratorKeyCommand extends BaseCommand {
	public schema = updateGeneratorKeyCommandParamsSchema;
	private _validatorsMethod!: ValidatorsMethod;

	public addDependencies(validatorsMethod: ValidatorsMethod) {
		this._validatorsMethod = validatorsMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<UpdateGeneratorKeyParams>,
	): Promise<VerificationResult> {
		const { transaction } = context;

		const validatorSubstore = this.stores.get(ValidatorStore);
		const entryExists = await validatorSubstore.has(context, transaction.senderAddress);

		if (!entryExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Validator substore must have an entry for the store key address'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<UpdateGeneratorKeyParams>): Promise<void> {
		const { transaction } = context;
		const methodContext = context.getMethodContext();

		await this._validatorsMethod.setValidatorGeneratorKey(
			methodContext,
			transaction.senderAddress,
			context.params.generatorKey,
		);
	}
}
