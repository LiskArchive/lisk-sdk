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
import { LiskValidationError, validator } from '../src';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cloneDeep = require('lodash.clonedeep');

describe('LiskValidationError formatter', () => {
	// Arrange
	const validSchema = {
		$id: '/my-schema',
		$schema: 'http://lisk.io/lisk-schema/schema#',
		type: 'object',
		properties: {
			myProp: {
				type: 'string',
			},
		},
		required: ['myProp'],
	};

	beforeEach(() => {
		// As compile cache the schema
		validator.removeSchema(validSchema.$id);
	});

	it('should format type errors', () => {
		const schema = cloneDeep(validSchema);
		const obj = {
			myProp: 10,
		};

		const expectedError =
			"Lisk validator found 1 error[s]:\nProperty '.myProp' should be of type 'string'";
		expect(() => {
			throw new LiskValidationError([...validator.validate(schema, obj)]);
		}).toThrow(expectedError);
	});

	it('should format minLength errors', () => {
		const schema = cloneDeep(validSchema);
		schema.properties.myProp.minLength = 2;
		const obj = {
			myProp: 'n',
		};

		const expectedError =
			"Lisk validator found 1 error[s]:\nProperty '.myProp' must NOT have fewer than 2 characters";
		expect(() => {
			throw new LiskValidationError([...validator.validate(schema, obj)]);
		}).toThrow(expectedError);
	});

	it('should format maxLength errors', () => {
		const schema = cloneDeep(validSchema);
		schema.properties.myProp.maxLength = 5;
		const obj = {
			myProp: 'too much foo bar',
		};

		const expectedError =
			"Lisk validator found 1 error[s]:\nProperty '.myProp' must NOT have more than 5 characters";
		expect(() => {
			throw new LiskValidationError([...validator.validate(schema, obj)]);
		}).toThrow(expectedError);
	});

	it('should format custom format errors', () => {
		const schema = cloneDeep(validSchema);
		schema.properties.myProp.format = 'hex';
		const obj = {
			myProp: 'this is not hex',
		};

		const expectedError =
			'Lisk validator found 1 error[s]:\nProperty \'.myProp\' must match format "hex"';
		expect(() => {
			throw new LiskValidationError([...validator.validate(schema, obj)]);
		}).toThrow(expectedError);
	});

	it('should format missing required property errors', () => {
		const schema = cloneDeep(validSchema);
		const obj = {};

		const expectedError =
			"Lisk validator found 1 error[s]:\nMissing property, must have required property 'myProp'";
		expect(() => {
			throw new LiskValidationError([...validator.validate(schema, obj)]);
		}).toThrow(expectedError);
	});

	it('should format additional property errors', () => {
		const schema = {
			$id: '/my-schema',
			$schema: 'http://lisk.io/lisk-schema/schema#',
			type: 'object',
			properties: {
				myProp: {
					type: 'object',
					properties: {
						foo: {
							type: 'string',
						},
					},
					additionalProperties: false,
				},
			},
			required: ['myProp'],
		};

		const obj = {
			myProp: {
				foo: 'bar',
				bar: 'baz',
			},
		};

		const expectedError =
			"Lisk validator found 1 error[s]:\nProperty '.myProp' has extraneous property 'bar'";
		expect(() => {
			throw new LiskValidationError([...validator.validate(schema, obj)]);
		}).toThrow(expectedError);
	});
});
