/*
 * Copyright © 2023 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';
import { ValidatorWeightWithRandomHash } from './types';
import { Validator } from './stores';

// Same as pos/utils/shuffleValidatorList
export const shuffleValidatorList = (
	roundSeed: Buffer,
	validators: Validator[],
): ValidatorWeightWithRandomHash[] => {
	const validatorsWithRoundHash: ValidatorWeightWithRandomHash[] = [];
	for (const validator of validators) {
		const seedSource = Buffer.concat([roundSeed, validator.address]);
		validatorsWithRoundHash.push({
			...validator,
			roundHash: utils.hash(seedSource),
		});
	}

	validatorsWithRoundHash.sort((validator1, validator2) => {
		const diff = validator1.roundHash.compare(validator2.roundHash);
		if (diff !== 0) {
			return diff;
		}

		return validator1.address.compare(validator2.address);
	});

	return validatorsWithRoundHash;
};
