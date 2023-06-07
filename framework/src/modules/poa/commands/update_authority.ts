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

import { MAX_UINT64 } from '@liskhq/lisk-validator';
import { address, bls, utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { objects as objectUtils } from '@liskhq/lisk-utils';
import { BaseCommand } from '../../base_command';
import { updateAuthoritySchema, validatorSignatureMessageSchema } from '../schemas';
import {
	COMMAND_UPDATE_AUTHORITY,
	MAX_NUM_VALIDATORS,
	MESSAGE_TAG_POA,
	EMPTY_BYTES,
	UpdateAuthorityResult,
	KEY_SNAPSHOT_0,
} from '../constants';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { UpdateAuthorityParams } from '../types';
import { ChainPropertiesStore, SnapshotStore, ValidatorStore } from '../stores';
import { ValidatorsMethod } from '../../pos/types';
import { AuthorityUpdateEvent } from '../events/authority_update';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0047.md#update-authority-command
export class UpdateAuthorityCommand extends BaseCommand {
	public schema = updateAuthoritySchema;
	private _validatorsMethod!: ValidatorsMethod;

	public get name(): string {
		return COMMAND_UPDATE_AUTHORITY;
	}

	public addDependencies(validatorsMethod: ValidatorsMethod) {
		this._validatorsMethod = validatorsMethod;
	}

	public async verify(
		context: CommandVerifyContext<UpdateAuthorityParams>,
	): Promise<VerificationResult> {
		const { newValidators, threshold, validatorsUpdateNonce } = context.params;

		if (newValidators.length < 1 || newValidators.length > MAX_NUM_VALIDATORS) {
			throw new Error(
				`newValidators length must be between 1 and ${MAX_NUM_VALIDATORS} (inclusive).`,
			);
		}

		const newValidatorsAddresses = newValidators.map(newValidator => newValidator.address);
		if (!objectUtils.bufferArrayOrderByLex(newValidatorsAddresses)) {
			throw new Error('Addresses in newValidators are not lexicographically ordered.');
		}

		if (!objectUtils.bufferArrayUniqueItems(newValidatorsAddresses)) {
			throw new Error('Addresses in newValidators are not unique.');
		}

		const validatorStore = this.stores.get(ValidatorStore);
		let totalWeight = BigInt(0);
		for (const newValidator of newValidators) {
			const validatorExists = await validatorStore.has(context, newValidator.address);
			if (!validatorExists) {
				throw new Error(
					`${address.getLisk32AddressFromPublicKey(
						newValidator.address,
					)} does not exist in validator store.`,
				);
			}
			totalWeight += newValidator.weight;
		}

		if (totalWeight > MAX_UINT64) {
			throw new Error(`Validators total weight exceeds ${MAX_UINT64}.`);
		}

		const minThreshold = totalWeight / BigInt(3) + BigInt(1);
		if (threshold < minThreshold || threshold > totalWeight) {
			throw new Error(`Threshold must be between ${minThreshold} and ${totalWeight} (inclusive).`);
		}

		const chainPropertiesStore = await this.stores
			.get(ChainPropertiesStore)
			.get(context, EMPTY_BYTES);
		if (validatorsUpdateNonce !== chainPropertiesStore.validatorsUpdateNonce) {
			throw new Error(
				`validatorsUpdateNonce must be equal to ${chainPropertiesStore.validatorsUpdateNonce}.`,
			);
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<UpdateAuthorityParams>): Promise<void> {
		const { newValidators, threshold, validatorsUpdateNonce, aggregationBits, signature } =
			context.params;

		// Verify weighted aggregated signature.
		const message = codec.encode(validatorSignatureMessageSchema, {
			newValidators,
			threshold,
			validatorsUpdateNonce,
		});

		const validatorsInfos = [];
		const snapshotStore = this.stores.get(SnapshotStore);
		const snapshot0 = await snapshotStore.get(context, KEY_SNAPSHOT_0);
		for (const snapshotValidator of snapshot0.validators) {
			const keys = await this._validatorsMethod.getValidatorKeys(
				context,
				snapshotValidator.address,
			);
			validatorsInfos.push({
				key: keys.blsKey,
				weight: snapshotValidator.weight,
			});
		}

		validatorsInfos.sort((a, b) => a.key.compare(b.key));
		const verified = bls.verifyWeightedAggSig(
			validatorsInfos.map(validatorInfo => validatorInfo.key),
			aggregationBits,
			signature,
			MESSAGE_TAG_POA,
			context.chainID,
			message,
			validatorsInfos.map(validatorInfo => validatorInfo.weight),
			snapshot0.threshold,
		);

		const authorityUpdateEvent = this.events.get(AuthorityUpdateEvent);
		if (!verified) {
			authorityUpdateEvent.log(
				context,
				{
					result: UpdateAuthorityResult.FAIL_INVALID_SIGNATURE,
				},
				true,
			);
			throw new Error('Invalid weighted aggregated signature.');
		}
		await snapshotStore.set(context, utils.intToBuffer(2, 4), {
			validators: newValidators,
			threshold,
		});

		const chainPropertiesStore = this.stores.get(ChainPropertiesStore);
		const chainProperties = await chainPropertiesStore.get(context, EMPTY_BYTES);
		await chainPropertiesStore.set(context, EMPTY_BYTES, {
			...chainProperties,
			validatorsUpdateNonce: chainProperties.validatorsUpdateNonce + 1,
		});

		authorityUpdateEvent.log(
			context,
			{
				result: UpdateAuthorityResult.SUCCESS,
			},
			false,
		);
	}
}
