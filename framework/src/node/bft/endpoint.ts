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

import { BlockHeader } from '@liskhq/lisk-chain';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../../modules/base_endpoint';
import { areHeadersContradictingRequestSchema } from './schemas';
import { areDistinctHeadersContradicting } from './utils';

export class BFTEndpoint extends BaseEndpoint {
	// eslint-disable-next-line @typescript-eslint/require-await
	public async areHeadersContradicting(context: ModuleEndpointContext): Promise<boolean> {
		const errors = validator.validate(areHeadersContradictingRequestSchema, context.params);
		if (errors.length > 0) {
			throw new LiskValidationError(errors);
		}

		const bftHeader1 = BlockHeader.fromBytes(Buffer.from(context.params.header1 as string, 'hex'));
		const bftHeader2 = BlockHeader.fromBytes(Buffer.from(context.params.header2 as string, 'hex'));

		if (bftHeader1.id.equals(bftHeader2.id)) {
			return false;
		}
		return areDistinctHeadersContradicting(bftHeader1, bftHeader2);
	}
}
