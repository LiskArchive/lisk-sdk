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
/* eslint-disable no-bitwise */
import {
	ActiveValidator,
	Certificate,
	LastCertificate,
	utils,
	ActiveValidatorsUpdate,
} from 'lisk-sdk';
import { ValidatorsData } from './types';

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md#computing-the-validators-update
 */
export const calculateActiveValidatorsUpdate = (
	certificate: Certificate,
	validatorsHashPreimage: ValidatorsData[],
	lastCertificate: LastCertificate,
): { activeValidatorsUpdate: ActiveValidatorsUpdate; certificateThreshold: bigint } => {
	let certificateThreshold;
	const validatorDataAtCertificate = validatorsHashPreimage.find(validatorsData =>
		validatorsData.validatorsHash.equals(certificate.validatorsHash),
	);

	if (!validatorDataAtCertificate) {
		throw new Error('No validators data found for the certificate height.');
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
		certificateThreshold = validatorDataAtLastCertificate.certificateThreshold;
	} else {
		certificateThreshold = validatorDataAtCertificate.certificateThreshold;
	}

	const activeValidatorsUpdate = getActiveValidatorsUpdate(
		validatorDataAtLastCertificate.validators,
		validatorDataAtCertificate.validators,
	);

	return { activeValidatorsUpdate, certificateThreshold };
};

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md#computing-the-validators-update
 */
export const getActiveValidatorsUpdate = (
	currentValidators: ActiveValidator[],
	newValidators: ActiveValidator[],
): ActiveValidatorsUpdate => {
	const currentValidatorsMap = new utils.dataStructures.BufferMap<ActiveValidator>();
	const allBLSKeysSet = new utils.dataStructures.BufferSet();
	for (const v of currentValidators) {
		currentValidatorsMap.set(v.blsKey, v);
		allBLSKeysSet.add(v.blsKey);
	}

	const validatorsUpdate: ActiveValidator[] = [];
	const blsKeysUpdate: Buffer[] = [];
	const newBLSKeys = new utils.dataStructures.BufferSet();
	for (const v of newValidators) {
		newBLSKeys.add(v.blsKey);
		allBLSKeysSet.add(v.blsKey);
		const currentValidator = currentValidatorsMap.get(v.blsKey);
		// if new validator does not exist, add to the blsKeysUpdate and validatorsUpdate
		if (!currentValidator) {
			blsKeysUpdate.push(v.blsKey);
			validatorsUpdate.push(v);
			continue;
		}
		// if currentValidator exist, but bft weight is different, then add to the validatorsUpdate
		if (currentValidator.bftWeight !== v.bftWeight) {
			validatorsUpdate.push(v);
		}
	}

	for (const v of currentValidators) {
		// We add the validator to the validatorsUpdate (with 0 BFT weight) if the BLS key is not in the newValidators.
		if (!newBLSKeys.has(v.blsKey)) {
			validatorsUpdate.push({
				blsKey: v.blsKey,
				bftWeight: BigInt(0),
			});
		}
	}
	blsKeysUpdate.sort((a, b) => a.compare(b));
	validatorsUpdate.sort((a, b) => a.blsKey.compare(b.blsKey));

	const bftWeightsUpdate = validatorsUpdate.map(v => v.bftWeight);
	const allBLSKeys = [...allBLSKeysSet];
	allBLSKeys.sort((a, b) => a.compare(b));

	let bitmap = BigInt(0);
	const bitmapSize = Number(BigInt(allBLSKeys.length + 7) / BigInt(8));
	for (const validator of validatorsUpdate) {
		const index = allBLSKeys.findIndex(k => k.equals(validator.blsKey));
		bitmap |= BigInt(1) << BigInt(index);
	}
	const hexBitmap = bitmap.toString(16);
	// prepend zero if length is odd number
	let bftWeightsUpdateBitmap = Buffer.from(
		hexBitmap.length % 2 === 0 ? hexBitmap : `0${hexBitmap}`,
		'hex',
	);
	// if the result does not have enough length, pad zero to the left
	if (bftWeightsUpdateBitmap.length < bitmapSize) {
		bftWeightsUpdateBitmap = Buffer.concat([
			Buffer.alloc(bitmapSize - bftWeightsUpdateBitmap.length),
			bftWeightsUpdateBitmap,
		]);
	}

	return {
		blsKeysUpdate,
		bftWeightsUpdate,
		bftWeightsUpdateBitmap,
	};
};
