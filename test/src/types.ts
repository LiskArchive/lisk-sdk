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
 *
 */

import * as passphrase from '../../examples/dpos-mainchain/config/default/passphrase.json';
import * as validators from '../../examples/dpos-mainchain/config/default/dev-validators.json';

export type PassphraseFixture = typeof passphrase;
export type ValidatorsFixture = typeof validators;

export interface Fixtures {
	passphrase: PassphraseFixture;
	validators: ValidatorsFixture;
	dataPath: string;
}
