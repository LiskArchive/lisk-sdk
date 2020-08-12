/*
 * Copyright © 2020 Lisk Foundation
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
/* eslint-disable class-methods-use-this */

import { Schema } from '@liskhq/lisk-codec';
import { ValidateAssetInput, ApplyAssetInput } from '../types';

export abstract class BaseAsset<T = unknown> {
	public baseFee = BigInt(0);

	public abstract name: string;
	public abstract type: number;
	public abstract assetSchema: Schema;

	public validateAsset?(input: ValidateAssetInput<T>): void;

	public abstract async applyAsset(input: ApplyAssetInput<T>): Promise<void>;
}
