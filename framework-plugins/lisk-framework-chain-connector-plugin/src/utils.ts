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

import { AggregateCommit } from 'lisk-sdk';
import { ValidatorsData } from './types';

export const aggregateCommitToJSON = (aggregateCommit: AggregateCommit) => ({
	height: aggregateCommit.height,
	aggregationBits: aggregateCommit.aggregationBits.toString('hex'),
	certificateSignature: aggregateCommit.certificateSignature.toString('hex'),
});

export const validatorsHashPreimagetoJSON = (validatorsHashPreimage: ValidatorsData[]) => {
	const validatorsHashPreimageJSON = [];
	for (const validatorData of validatorsHashPreimage) {
		const validatorsJSON = validatorData.validators.map(v => ({
			address: v.address.toString('hex'),
			bftWeight: v.bftWeight.toString(),
			blsKey: v.blsKey.toString('hex'),
		}));
		validatorsHashPreimageJSON.push({
			certificateThreshold: validatorData.certificateThreshold.toString(),
			validators: validatorsJSON,
			validatorsHash: validatorData.validatorsHash.toString('hex'),
		});
	}
	return validatorsHashPreimageJSON;
};
