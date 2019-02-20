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
 */

'use strict';

const rewire = require('rewire');
const chai = require('chai');

const expect = chai.expect;

const failureCodesRewired = rewire(
	'../../../../../../../../../src/modules/chain/api/ws/rpc/failure_codes'
);
const PeerUpdateError = failureCodesRewired.PeerUpdateError;

let peerUpdateErrorInstance;
let errorCode;
let errorMessage;
let errorDesc;
let result;

describe('failure_codes', () => {
	beforeEach(async () => {
		errorCode = 1234;
		errorMessage = 'Peer failed...';
		errorDesc = 'Something went wrong.';
		peerUpdateErrorInstance = new PeerUpdateError(
			errorCode,
			errorMessage,
			errorDesc
		);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('PeerUpdateError', () => {
		describe('constructor', () => {
			beforeEach(async () => {
				peerUpdateErrorInstance = new PeerUpdateError(
					errorCode,
					errorMessage,
					errorDesc
				);
			});

			it('should be an instance of Error', async () =>
				expect(peerUpdateErrorInstance).to.be.an.instanceOf(Error));

			it('should have a valid code property', async () =>
				expect(peerUpdateErrorInstance)
					.to.have.property('code')
					.which.equals(errorCode));

			it('should have a valid message property', async () =>
				expect(peerUpdateErrorInstance)
					.to.have.property('message')
					.which.equals(errorMessage));

			it('should have a valid description property', async () =>
				expect(peerUpdateErrorInstance)
					.to.have.property('description')
					.which.equals(errorDesc));
		});

		describe('toString', () => {
			beforeEach(async () => {
				result = peerUpdateErrorInstance.toString();
			});

			it('should return a JSON string representation of the error', async () =>
				expect(result).to.equal(
					'{"code":1234,"message":"Peer failed...","description":"Something went wrong."}'
				));
		});
	});
});
