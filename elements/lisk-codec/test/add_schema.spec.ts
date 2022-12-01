/*
 * Copyright © 2020 Lisk Foundation
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

import { objects } from '@liskhq/lisk-utils';
import { testCases as objectsTestCases } from '../fixtures/objects_encodings.json';
import { codec } from '../src/codec';

describe('addSchema', () => {
	// Arrange
	const objectFixtureInput = objectsTestCases[0].input;

	it('should add schema and keep it in cache', () => {
		const object = {
			...objectFixtureInput.object,
			balance: BigInt(objectFixtureInput.object.balance as unknown as string),
			address: Buffer.from(objectFixtureInput.object.address as unknown as string, 'hex'),
		};

		codec.encode(objectFixtureInput.schema, object);

		expect((codec as any)._compileSchemas.object11).toMatchSnapshot();
	});

	it('should throw if schema does not have fieldNumber in properties at root level', () => {
		const { schema } = objectFixtureInput;
		const customSchema = objects.cloneDeep(schema);
		// Remove the field number in properties at root level
		delete (customSchema as any).properties.asset.fieldNumber;

		expect(() => codec.addSchema(customSchema)).toThrow(
			'Invalid schema. Missing "fieldNumber" in properties',
		);
	});

	it('should throw if schema does not have fieldNumber in properties at nested level 1', () => {
		const { schema } = objectFixtureInput;
		const customSchema = objects.cloneDeep(schema);
		// Remove the field number in properties at nested level 1
		delete (customSchema as any).properties.asset.properties.fooBar.fieldNumber;

		expect(() => codec.addSchema(customSchema)).toThrow(
			'Invalid schema. Missing "fieldNumber" in properties',
		);
	});

	it('should throw if schema does not have fieldNumber in properties at nested level 2', () => {
		const { schema } = objectFixtureInput;
		const customSchema = objects.cloneDeep(schema);
		// Remove the field number in properties at nested level 2
		delete (customSchema as any).properties.asset.properties.fooBar.properties.foo.fieldNumber;

		expect(() => codec.addSchema(customSchema)).toThrow(
			'Invalid schema. Missing "fieldNumber" in properties',
		);
	});
});
