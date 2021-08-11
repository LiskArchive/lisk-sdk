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
import { BaseModule } from '../base_module';
import { LiskBFTAPI } from './api';
import { LiskBFTEndpoint } from './endpoint';
import { liskBFTModuleID } from './constants';

export class LiskBFTModule extends BaseModule {
	public id = liskBFTModuleID;
	public name = 'liskBFT';
	public api = new LiskBFTAPI(this.id);
	public endpoint = new LiskBFTEndpoint(this.id);
}
