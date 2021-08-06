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

import { BaseModule } from '../../../../modules';
import { ValidatorAPI } from './api';
import { ValidatorEndpoint } from './endpoint';

export class ValidatorModule extends BaseModule {
	public id = 10;
	public name = 'validator';
	public api = new ValidatorAPI(this.id);
	public endpoint = new ValidatorEndpoint(this.id);
}
