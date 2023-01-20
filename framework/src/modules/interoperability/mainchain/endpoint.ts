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
import { CHAIN_REGISTRATION_FEE } from '../constants';

export class MainchainInteroperabilityEndpoint extends BaseInteroperabilityEndpoint {
	public getRegistrationFee(): { fee: string } {
		return { fee: CHAIN_REGISTRATION_FEE.toString() };
	}
}
