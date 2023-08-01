/*
 * Copyright © 2022 Lisk Foundation
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
import { BaseInteroperabilityEndpoint } from '../base_interoperability_endpoint';
import { ModuleEndpointContext } from '../../../types';
import { isChainIDAvailableRequestSchema } from '../schemas';
import { getMainchainID } from '../utils';

export class SidechainInteroperabilityEndpoint extends BaseInteroperabilityEndpoint {
	public getMainchainID(context: ModuleEndpointContext): { mainchainID: string } {
		validator.validate(isChainIDAvailableRequestSchema, context.params);

		const chainID = Buffer.from(context.params.chainID as string, 'hex');
		return { mainchainID: getMainchainID(chainID).toString('hex') };
	}
}
