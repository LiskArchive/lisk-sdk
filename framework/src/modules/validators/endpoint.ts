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

import { blsPopVerify } from '@liskhq/lisk-cryptography';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { ModuleEndpointContext } from '../..';
import { BaseEndpoint } from '../base_endpoint';
import { generatorListSchema, validateBLSKeyRequest, validateBLSKeyRequestSchema } from './schemas';
import {
	MODULE_ID_VALIDATORS,
	STORE_PREFIX_BLS_KEYS,
	STORE_PREFIX_GENERATOR_LIST,
} from './constants';

export class ValidatorsEndpoint extends BaseEndpoint {
	public async getGeneratorList(ctx: ModuleEndpointContext): Promise<Buffer[]> {
		const subStore = ctx.getStore(MODULE_ID_VALIDATORS, STORE_PREFIX_GENERATOR_LIST);
		const value = await subStore.getWithSchema<Record<string, unknown>>(
			Buffer.from([0]),
			generatorListSchema,
		);
		const list = value.addresses as Buffer[];
		return list;
	}

	public async validateBLSKey(ctx: ModuleEndpointContext): Promise<boolean> {
		const reqErrors = validator.validate(validateBLSKeyRequestSchema, ctx.params);
		if (reqErrors?.length) {
			throw new LiskValidationError(reqErrors);
		}

		const req = (ctx.params as unknown) as validateBLSKeyRequest;
		const { proofOfPosession, blsKey } = req;

		const subStore = ctx.getStore(MODULE_ID_VALIDATORS, STORE_PREFIX_BLS_KEYS);

		if (await subStore.get(blsKey)) {
			return false;
		}
		if (!blsPopVerify(blsKey, proofOfPosession)) {
			return false;
		}

		return true;
	}
}
