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

import { BaseAPI } from '../../../../modules/base_api';
import { GeneratorStore } from '../../../generator';
import { APIContext } from '../../../state_machine';

interface Validator {
	address: Buffer;
	bftWeight: bigint;
}

export class LiskBFTAPI extends BaseAPI {
	public async verifyGeneratorInfo(
		_apiContext: APIContext,
		_generatorStore: GeneratorStore,
		_info: {
			address: Buffer;
			height: number;
			maxHeightPrevoted: number;
			maxHeightPreviouslyForged: number;
			override?: boolean;
		},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
	): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getValidators(_apiContext: APIContext): Promise<Validator[]> {
		return [];
	}
}
