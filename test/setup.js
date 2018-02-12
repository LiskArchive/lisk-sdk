/*
 * Copyright © 2017 Lisk Foundation
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
import sinon from 'sinon';
import chai, { Assertion } from 'chai';
import 'chai/register-should';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import naclFactory from 'js-nacl';

process.env.NODE_ENV = 'test';

Assertion.addMethod('hexString', function handleAssert(type) {
	// eslint-disable-next-line no-underscore-dangle
	const obj = this._obj;

	// eslint-disable-next-line no-underscore-dangle
	new Assertion(this._obj).to.be.a('string');

	// second, our type check
	this.assert(
		// eslint-disable-next-line no-underscore-dangle
		obj._type === type,
		'expected #{this} to be of type #{exp} but got #{act}',
		'expected #{this} to not be of type #{act}',
		type,
		// eslint-disable-next-line no-underscore-dangle
		obj._type,
	);
	// eslint-disable-next-line no-underscore-dangle
	const converted = Buffer.from(this._obj, 'hex').toString('hex');
	this.assert(
		converted === obj,
		'expected #{this} to be of hexString #{exp} but got #{act}',
		'expected #{this} to not be of type #{act}',
		obj,
		converted,
	);
});

Assertion.addMethod('integer', function handleAssert(type) {
	// eslint-disable-next-line no-underscore-dangle
	const obj = this._obj;

	// first, our instanceof check, shortcut
	// eslint-disable-next-line no-underscore-dangle
	new Assertion(this._obj).to.be.a('number');

	// second, our type check
	this.assert(
		// eslint-disable-next-line no-underscore-dangle
		obj._type === type,
		'expected #{this} to be of type #{exp} but got #{act}',
		'expected #{this} to not be of type #{act}',
		type,
		// eslint-disable-next-line no-underscore-dangle
		obj._type,
	);
	// eslint-disable-next-line no-underscore-dangle
	const converted = parseInt(this._obj, 10);
	this.assert(
		converted === obj,
		'expected #{this} to be of hexString #{exp} but got #{act}',
		'expected #{this} to not be of type #{act}',
		obj,
		converted,
	);
});

[chaiAsPromised, sinonChai].forEach(plugin => chai.use(plugin));

global.should = chai.should();
global.sinon = sinon;
global.sandbox = sinon.sandbox.create();

if (!global.naclInstance) {
	naclFactory.instantiate(nacl => {
		global.naclInstance = nacl;
	});
}
