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

import { validator } from '@liskhq/lisk-validator';
import { BaseCommand } from '../../base_command';
import { updateGeneratorKeyParamsSchema } from '../schemas';
import { ValidatorsMethod } from '../../pos/types';
import { COMMAND_UPDATE_KEY } from '../constants';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { UpdateGeneratorKeyParams } from '../types';
import { NameStore } from '../stores';
import { getSenderAddress } from '../utils';

export class updateGeneratorKeyCommand extends BaseCommand {
	public schema = updateGeneratorKeyParamsSchema;
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
		try {
			validator.validate(updateGeneratorKeyParamsSchema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		const senderAddress = getSenderAddress(context.transaction.senderPublicKey);
		const isValidatorExist = await this.stores.get(NameStore).has(context, senderAddress);
		if (!isValidatorExist) {
			throw new Error('validator does not exist');
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<UpdateGeneratorKeyParams>): Promise<void> {
		const { generatorKey } = context.params;

		const senderAddress = getSenderAddress(context.transaction.senderPublicKey);
		await this._validatorsMethod.setValidatorGeneratorKey(context, senderAddress, generatorKey);
	}
}
