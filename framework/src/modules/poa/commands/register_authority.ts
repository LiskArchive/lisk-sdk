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
import { registerAuthorityParamsSchema } from '../schemas';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { FeeMethod, RegisterAuthorityParams, ValidatorsMethod } from '../types';
import { COMMAND_REGISTER_AUTHORITY, REGISTRATION_FEE } from '../constants';
import { ValidatorStore, NameStore } from '../stores';
import { getSenderAddress } from '../utils';

export class RegisterAuthorityCommand extends BaseCommand {
	public schema = registerAuthorityParamsSchema;
	private _validatorsMethod!: ValidatorsMethod;
	private _feeMethod!: FeeMethod;

	public get name(): string {
		return COMMAND_REGISTER_AUTHORITY;
	}

	public addDependencies(validatorsMethod: ValidatorsMethod, feeMethod: FeeMethod) {
		this._validatorsMethod = validatorsMethod;
		this._feeMethod = feeMethod;
	}

	public async verify(
		context: CommandVerifyContext<RegisterAuthorityParams>,
	): Promise<VerificationResult> {
		const { name } = context.params;
		try {
			validator.validate(registerAuthorityParamsSchema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		if (!/^[a-z0-9!@$&_.]+$/g.test(name)) {
			throw new Error('Invalid name');
		}

		const isNameExist = await this.stores.get(NameStore).has(context, Buffer.from(name));
		if (isNameExist) {
			throw new Error('name already exist');
		}

		const senderAddress = getSenderAddress(context.transaction.senderPublicKey);
		const isValidatorExist = await this.stores.get(ValidatorStore).has(context, senderAddress);
		if (isValidatorExist) {
			throw new Error('validator already exist');
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<RegisterAuthorityParams>): Promise<void> {
		const { params } = context;

		const senderAddress = getSenderAddress(context.transaction.senderPublicKey);
		this._feeMethod.payFee(context, REGISTRATION_FEE);

		await this.stores.get(ValidatorStore).set(context, senderAddress, {
			name: params.name,
		});

		await this.stores.get(NameStore).set(context, Buffer.from(params.name), {
			address: senderAddress,
		});

		await this._validatorsMethod.registerValidatorKeys(
			context,
			senderAddress,
			params.proofOfPossession,
			params.generatorKey,
			params.blsKey,
		);
	}
}
