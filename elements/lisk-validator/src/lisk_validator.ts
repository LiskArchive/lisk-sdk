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
 *
 */

import * as Ajv from 'ajv';
import * as formats from './formats';

class LiskValidator {
	private readonly validator: Ajv.Ajv;
	public constructor() {
		this.validator = new Ajv({
			allErrors: true,
			schemaId: 'auto',
			useDefaults: false,
		});

		for (const formatName of Object.keys(formats)) {
			this.validator.addFormat(
				formatName,
				formats[formatName as keyof typeof formats],
			);
		}

		this.validator.addKeyword('uniqueSignedPublicKeys', {
			type: 'array',
			compile: () => (data: ReadonlyArray<string>) =>
				new Set(data.map((key: string) => key.slice(1))).size === data.length,
		});
	}

	public validate(schema: object, data: object): [] {
		if (!this.validator.validate(schema, data)) {
			return this.validator.errors as [];
		}

		return [];
	}
}

export const validator = new LiskValidator();
