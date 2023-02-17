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

import { BaseInteroperabilityEndpoint } from '../base_interoperability_endpoint';
import { CHAIN_REGISTRATION_FEE, MIN_RETURN_FEE_PER_BYTE_LSK } from '../constants';
import { getCCMSize } from '../utils';
import {
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	USER_SUBSTORE_INITIALIZATION_FEE,
} from '../../token/constants';
import { ModuleEndpointContext } from '../../../types';
import { CCMsg } from '../types';

export class MainchainInteroperabilityEndpoint extends BaseInteroperabilityEndpoint {
	public getRegistrationFee(): { fee: string } {
		return { fee: CHAIN_REGISTRATION_FEE.toString() };
	}

	public getMinimumMessageFee(context: ModuleEndpointContext): { fee: string } {
		const ccm = context.params.ccm as CCMsg;

		let additionalFee = BigInt(0);

		// Check if user account has to be initialized
		if (
			ccm.crossChainCommand === CROSS_CHAIN_COMMAND_NAME_TRANSFER &&
			!context.params.isUserInitialized
		) {
			additionalFee += USER_SUBSTORE_INITIALIZATION_FEE;
		}

		return {
			fee: (getCCMSize(ccm) * MIN_RETURN_FEE_PER_BYTE_LSK + additionalFee).toString(),
		};
	}
}
