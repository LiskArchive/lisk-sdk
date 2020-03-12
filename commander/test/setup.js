/*
 * LiskHQ/lisk-commander
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
const os = require('os');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');

const { Assertion } = chai;

process.env.NODE_ENV = 'test';
process.env.LISK_COMMANDER_CONFIG_DIR =
	process.env.LISK_COMMANDER_CONFIG_DIR || `${os.homedir()}/.lisk-commander`;

Assertion.addMethod('matchAny', function handleAssert(matcher) {
	const obj = this._obj;

	new Assertion(obj).to.be.an('array');
	const result = obj.some(val => matcher(val));
	this.assert(
		result,
		'expected #{this} to match at least once',
		'expected #{this} not to match',
	);
});

Assertion.addMethod('customError', function handleAssert(error) {
	const obj = this._obj;
	new Assertion(obj).to.be.instanceOf(Error);
	new Assertion(obj.name).to.equal(error.name);
	new Assertion(obj.message).to.equal(error.message);
});

[sinonChai, chaiAsPromised].forEach(chai.use);
