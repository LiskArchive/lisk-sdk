/*
 * LiskHQ/lisky
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
import os from 'os';
import 'babel-polyfill';
import should from 'should';
import sinon from 'sinon';
import 'should-sinon';
import mochaBDD from 'mocha-bdd';

process.env.NODE_ENV = 'test';
process.env.LISKY_CONFIG_DIR =
	process.env.LISKY_CONFIG_DIR || `${os.homedir()}/.lisky`;

should.use((_, Assertion) => {
	// istanbul ignore next
	Assertion.add('hexString', function hexString() {
		this.params = {
			operator: 'to be hex string',
		};
		Buffer.from(this.obj, 'hex')
			.toString('hex')
			.should.equal(this.obj);
	});
});

mochaBDD();
// See https://github.com/shouldjs/should.js/issues/41
Object.defineProperty(global, 'should', { value: should });
global.sinon = sinon;
global.sandbox = sinon.sandbox.create();
