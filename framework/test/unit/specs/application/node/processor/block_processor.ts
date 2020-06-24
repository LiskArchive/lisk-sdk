/*
 * Copyright © 2019 Lisk Foundation
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
/* eslint-disable max-classes-per-file */

import { BaseBlockProcessor } from '../../../../../../src/application/node/processor';

export class FakeBlockProcessorV0 extends BaseBlockProcessor {
	public readonly version = 0;

	public constructor() {
		super();
	}
}

export class FakeBlockProcessorV1 extends BaseBlockProcessor {
	public readonly version = 1;

	public constructor() {
		super();
	}
}

export class FakeBlockProcessorV2 extends BaseBlockProcessor {
	public readonly version = 2;

	public constructor() {
		super();
	}
}
