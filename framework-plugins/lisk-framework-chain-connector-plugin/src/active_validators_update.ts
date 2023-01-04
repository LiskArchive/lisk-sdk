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

import { Certificate, LastCertificate } from 'lisk-sdk';
import { ActiveValidatorWithAddress, ValidatorsData } from './types';

export const getActiveValidatorsDiff = (
	currentValidators: ActiveValidatorWithAddress[],
	newValidators: ActiveValidatorWithAddress[],
): ActiveValidatorWithAddress[] => {
	const activeValidatorsUpdate: ActiveValidatorWithAddress[] = [];

	for (const newValidator of newValidators) {
		const existingValidator = currentValidators.find(
			validator =>
				Buffer.compare(validator.blsKey, newValidator.blsKey) === 0 &&
				validator.bftWeight === newValidator.bftWeight,
		);

		if (existingValidator === undefined) {
			activeValidatorsUpdate.push(newValidator);
		}
	}

	for (const currentValidator of currentValidators) {
		const newValidator = newValidators.find(
			validator => Buffer.compare(validator.blsKey, currentValidator.blsKey) === 0,
		);

		if (newValidator === undefined) {
			activeValidatorsUpdate.push({
				blsKey: currentValidator.blsKey,
				bftWeight: BigInt(0),
				address: currentValidator.address,
			});
		}
	}

	return activeValidatorsUpdate;
};

// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md#computing-the-validators-update
export const calculateActiveValidatorsUpdate = (
	certificate: Certificate,
	validatorsHashPreimage: ValidatorsData[],
	lastCertificate: LastCertificate,
) => {
	let certificateThreshold;
	const validatorDataAtCertificate = validatorsHashPreimage.find(validatorsData =>
		validatorsData.validatorsHash.equals(certificate.validatorsHash),
	);

	if (!validatorDataAtCertificate) {
		throw new Error('No validators data found for the given certificate height.');
	}

	const validatorDataAtLastCertificate = validatorsHashPreimage.find(validatorsData =>
		validatorsData.validatorsHash.equals(lastCertificate.validatorsHash),
	);

	if (!validatorDataAtLastCertificate) {
		throw new Error('No validators data found for the given last certificate height.');
	}

	// If the certificate threshold is not changed from last certificate then we assign zero
	if (
		validatorDataAtCertificate.certificateThreshold ===
		validatorDataAtLastCertificate.certificateThreshold
	) {
		certificateThreshold = BigInt(0);
	} else {
		certificateThreshold = validatorDataAtCertificate.certificateThreshold;
	}

	const activeBFTValidatorsUpdate = getActiveValidatorsDiff(
		validatorDataAtLastCertificate.validators,
		validatorDataAtCertificate.validators,
	);

	const activeValidatorsUpdate = activeBFTValidatorsUpdate.map(validator => ({
		blsKey: validator.blsKey,
		bftWeight: validator.bftWeight,
	}));

	return { activeValidatorsUpdate, certificateThreshold };
};
