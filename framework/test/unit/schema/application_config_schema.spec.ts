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

import { validator } from '@liskhq/lisk-validator';
import { objects } from '@liskhq/lisk-utils';
import { applicationConfigSchema } from '../../../src/schema';

describe('schema/application_config_schema.js', () => {
	it('application config schema must match to the snapshot.', () => {
		expect(applicationConfigSchema).toMatchSnapshot();
	});

	it('should validate the defined schema', () => {
		expect(() => validator.validateSchema(applicationConfigSchema)).not.toThrow();
	});

	it('should validate if module properties are objects', () => {
		const config = objects.cloneDeep(applicationConfigSchema.default);

		expect(() =>
			validator.validate(applicationConfigSchema, {
				...config,
				genesis: {
					...config.genesis,
					chainID: '10000000',
				},
				modules: { myModule: { myProp: 1 } },
			}),
		).not.toThrow();
	});

	it('should not validate if module properties are not objects', () => {
		const config = objects.cloneDeep(applicationConfigSchema.default);
		config.modules = { myModule: 10 };

		expect(() => validator.validate(applicationConfigSchema, config)).toThrow(
			"Property '.modules.myModule' should be of type 'object'",
		);
	});

	it('should not validate if module properties are not valid format', () => {
		const config = objects.cloneDeep(applicationConfigSchema.default);
		config.modules = { 'my-custom-module': { myProp: 1 } };

		expect(() => validator.validate(applicationConfigSchema, config)).toThrow(
			'must match pattern "^[a-zA-Z][a-zA-Z0-9_]*$"\nproperty name must be valid',
		);
	});
});
