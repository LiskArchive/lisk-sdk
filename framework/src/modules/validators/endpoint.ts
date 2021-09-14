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
import { NotFoundError } from '@liskhq/lisk-db';
import { ModuleEndpointContext } from '../..';
import { BaseEndpoint } from '../base_endpoint';
import { generatorListSchema, validateBLSKeyRequest, validateBLSKeyRequestSchema } from './schemas';
import {
	MODULE_ID_VALIDATORS,
	STORE_PREFIX_BLS_KEYS,
	STORE_PREFIX_GENERATOR_LIST,
} from './constants';
import { GeneratorList } from './types';

export class ValidatorsEndpoint extends BaseEndpoint {
	public async getGeneratorList(ctx: ModuleEndpointContext): Promise<{ list: string[] }> {
		const subStore = ctx.getStore(MODULE_ID_VALIDATORS, STORE_PREFIX_GENERATOR_LIST);
		const emptyKey = Buffer.alloc(0);
		const value = await subStore.getWithSchema<GeneratorList>(emptyKey, generatorListSchema);

		const addressList = value.addresses;

		return { list: addressList.map(buf => buf.toString()) };
	}

	public async validateBLSKey(ctx: ModuleEndpointContext): Promise<{ valid: boolean }> {
		const reqErrors = validator.validate(validateBLSKeyRequestSchema, ctx.params);
		if (reqErrors?.length) {
			throw new LiskValidationError(reqErrors);
		}

		const req = (ctx.params as unknown) as validateBLSKeyRequest;
		const { proofOfPossession, blsKey } = req;

		const subStore = ctx.getStore(MODULE_ID_VALIDATORS, STORE_PREFIX_BLS_KEYS);

		let persistedValue;

		try {
			persistedValue = await subStore.get(blsKey);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		if (persistedValue) {
			return { valid: false };
		}

		return { valid: blsPopVerify(blsKey, proofOfPossession) };
	}
}
