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
import { registerAuthoritySchema } from '../schemas';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { RegisterAuthorityParams, ValidatorsMethod, FeeMethod } from '../types';
import { COMMAND_REGISTER_AUTHORITY, POA_VALIDATOR_NAME_REGEX } from '../constants';
import { ValidatorStore, NameStore } from '../stores';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0047.md#register-authority-command
export class RegisterAuthorityCommand extends BaseCommand {
	public schema = registerAuthoritySchema;
	private _validatorsMethod!: ValidatorsMethod;
	private _feeMethod!: FeeMethod;
	private _authorityRegistrationFee!: bigint;

	public get name(): string {
		return COMMAND_REGISTER_AUTHORITY;
	}

	public init(args: { authorityRegistrationFee: bigint }) {
		this._authorityRegistrationFee = args.authorityRegistrationFee;
	}

	public addDependencies(validatorsMethod: ValidatorsMethod, feeMethod: FeeMethod) {
		this._validatorsMethod = validatorsMethod;
		this._feeMethod = feeMethod;
	}

	public async verify(
		context: CommandVerifyContext<RegisterAuthorityParams>,
	): Promise<VerificationResult> {
		const { name } = context.params;

		if (!POA_VALIDATOR_NAME_REGEX.test(name)) {
			throw new Error(`Name does not comply with format ${POA_VALIDATOR_NAME_REGEX.toString()}.`);
		}

		const nameExists = await this.stores.get(NameStore).has(context, Buffer.from(name, 'utf-8'));
		if (nameExists) {
			throw new Error('Name already exists.');
		}

		const validatorExists = await this.stores
			.get(ValidatorStore)
			.has(context, context.transaction.senderAddress);
		if (validatorExists) {
			throw new Error('Validator already exists.');
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<RegisterAuthorityParams>): Promise<void> {
		const { params } = context;

		this._feeMethod.payFee(context, this._authorityRegistrationFee);

		await this.stores.get(ValidatorStore).set(context, context.transaction.senderAddress, {
			name: params.name,
		});

		await this.stores.get(NameStore).set(context, Buffer.from(params.name, 'utf-8'), {
			address: context.transaction.senderAddress,
		});

		await this._validatorsMethod.registerValidatorKeys(
			context,
			context.transaction.senderAddress,
			params.blsKey,
			params.generatorKey,
			params.proofOfPossession,
		);
	}
}
