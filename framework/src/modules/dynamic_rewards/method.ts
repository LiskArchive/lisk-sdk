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

import { ImmutableMethodContext } from '../../state_machine';
import { BaseMethod } from '../base_method';
import { calculateDefaultReward } from '../reward/calculate_reward';
import { ModuleConfig } from './types';

export interface MethodInitArgs {
	config: ModuleConfig;
}

export class DynamicRewardMethod extends BaseMethod {
	private _config!: ModuleConfig;

	public init(args: MethodInitArgs) {
		this._config = args.config;
	}

	public getDefaultRewardAtHeight(_context: ImmutableMethodContext, height: number): bigint {
		return calculateDefaultReward(this._config, height);
	}
}
