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
import * as sinon from 'sinon';
import * as chai from 'chai';
import 'chai/register-expect';
import * as sinonChai from 'sinon-chai';

process.env.NODE_ENV = 'test';

chai.Assertion.addProperty('hexString', function handleAssert(
	this: Chai.ChaiStatic,
) {
	const actual = this._obj;

	new chai.Assertion(actual).to.be.a('string');

	const expected = Buffer.from(actual, 'hex').toString('hex');
	this.assert(
		expected === actual,
		'expected #{this} to be a hexString',
		'expected #{this} not to be a hexString',
	);
});

chai.Assertion.addProperty('integer', function handleAssert(
	this: Chai.ChaiStatic,
) {
	const actual = this._obj;

	new chai.Assertion(actual).to.be.a('number');

	const expected = parseInt(actual, 10);
	this.assert(
		actual === expected,
		'expected #{this} to be an integer',
		'expected #{this} not to be an integer',
	);
});

[sinonChai].forEach(plugin => chai.use(plugin));

global.sandbox = sinon.createSandbox({
	useFakeTimers: true,
});
