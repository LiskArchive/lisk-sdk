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

import { BaseInteroperabilityModule } from '../base_interoperability_module';
import { BaseInteroperableAPI } from '../base_interoperable_api';
import { SidechainInteroperabilityAPI } from './api';
import { SidechainCCAPI } from './cc_api';
import { SidechainInteroperabilityEndpoint } from './endpoint';

export class SidechainInteroperabilityModule extends BaseInteroperabilityModule {
	public crossChainAPI: BaseInteroperableAPI = new SidechainCCAPI(this.id);
	public api = new SidechainInteroperabilityAPI(this.id);
	public endpoint = new SidechainInteroperabilityEndpoint(this.id);
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public registerInteroperableModule(): void {
		// TODO
	}
}
