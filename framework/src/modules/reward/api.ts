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

import { BaseAPI } from '../base_api';
import { LiskBFTAPI, RandomAPI } from './types';

export class RewardAPI extends BaseAPI {
	private _liskBFTAPI!: LiskBFTAPI;
	private _randomAPI!: RandomAPI;

	public addDependencies(liskBFTAPI: LiskBFTAPI, randomAPI: RandomAPI): void {
		this._liskBFTAPI = liskBFTAPI;
		this._randomAPI = randomAPI;
		// eslint-disable-next-line no-console
		console.log(this._liskBFTAPI, this._randomAPI);
	}
}
