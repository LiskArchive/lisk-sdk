/*
 * Copyright © 2018 Lisk Foundation
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
import * as BigNum from '@liskhq/bignum';
import * as Ajv from 'ajv';

import {
	isCsv,
	isGreaterThanMaxTransactionId,
	isHexString,
	isNullCharacterIncluded,
	isNumberString,
	isSignature,
	isUsername,
	validateAddress,
	validateFee,
	validateNonTransferAmount,
	validatePublicKey,
	validateTransferAmount,
} from './validation';

class LiskValidator {
	private readonly validator: Ajv.Ajv;
	public constructor() {
		this.validator = new Ajv({
			allErrors: true,
			schemaId: 'auto',
			useDefaults: false,
		});

		this.validator.addFormat('signature', isSignature);

		this.validator.addFormat(
			'id',
			data =>
				isNumberString(data) &&
				!isGreaterThanMaxTransactionId(new BigNum(data)),
		);

		this.validator.addFormat('address', data => {
			try {
				validateAddress(data);

				return true;
			} catch (error) {
				return false;
			}
		});

		this.validator.addFormat('amount', isNumberString);

		this.validator.addFormat('transferAmount', validateTransferAmount);

		this.validator.addFormat('nonTransferAmount', validateNonTransferAmount);

		this.validator.addFormat('fee', validateFee);

		this.validator.addFormat('emptyOrPublicKey', data => {
			if (data === null || data === '') {
				return true;
			}

			try {
				validatePublicKey(data);

				return true;
			} catch (error) {
				return false;
			}
		});

		this.validator.addFormat('publicKey', data => {
			try {
				validatePublicKey(data);

				return true;
			} catch (error) {
				return false;
			}
		});

		this.validator.addFormat('signedPublicKey', data => {
			try {
				const action = data[0];
				if (action !== '+' && action !== '-') {
					return false;
				}
				const publicKey = data.slice(1);
				validatePublicKey(publicKey);

				return true;
			} catch (error) {
				return false;
			}
		});

		this.validator.addFormat('additionPublicKey', data => {
			const action = data[0];
			if (action !== '+') {
				return false;
			}
			try {
				const publicKey = data.slice(1);
				validatePublicKey(publicKey);

				return true;
			} catch (error) {
				return false;
			}
		});

		this.validator.addFormat('username', isUsername);

		this.validator.addFormat(
			'noNullCharacter',
			data => !isNullCharacterIncluded(data),
		);

		this.validator.addKeyword('uniqueSignedPublicKeys', {
			type: 'array',
			compile: () => (data: ReadonlyArray<string>) =>
				new Set(data.map((key: string) => key.slice(1))).size === data.length,
		});

		this.validator.addFormat('hex', isHexString);

		this.validator.addFormat('csv', isCsv);
	}

	public validate(schema: object, data: object): [] {
		const valid = this.validator.validate(schema, data);
		if (!valid) {
			return this.validator.errors as [];
		}

		return [];
	}
}

export const validator = new LiskValidator();
