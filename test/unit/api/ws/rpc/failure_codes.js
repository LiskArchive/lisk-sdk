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

const failureCodesRewired = rewire('../../../../../api/ws/rpc/failure_codes');
const PeerUpdateError = failureCodesRewired.PeerUpdateError;

var peerUpdateErrorInstance;
var errorCode;
var errorMessage;
var errorDesc;
var result;

describe('failure_codes', () => {
	beforeEach(done => {
		errorCode = 1234;
		errorMessage = 'Peer failed...';
		errorDesc = 'Something went wrong.';
		peerUpdateErrorInstance = new PeerUpdateError(
			errorCode,
			errorMessage,
			errorDesc
		);
		done();
	});

	describe('PeerUpdateError', () => {
		describe('constructor', () => {
			beforeEach(done => {
				peerUpdateErrorInstance = new PeerUpdateError(
					errorCode,
					errorMessage,
					errorDesc
				);
				done();
			});

			it('should be an instance of Error', () => {
				return expect(peerUpdateErrorInstance).to.be.an.instanceOf(Error);
			});

			it('should have a valid code property', () => {
				return expect(peerUpdateErrorInstance)
					.to.have.property('code')
					.which.equals(errorCode);
			});

			it('should have a valid message property', () => {
				return expect(peerUpdateErrorInstance)
					.to.have.property('message')
					.which.equals(errorMessage);
			});

			it('should have a valid description property', () => {
				return expect(peerUpdateErrorInstance)
					.to.have.property('description')
					.which.equals(errorDesc);
			});
		});

		describe('toString', () => {
			beforeEach(done => {
				result = peerUpdateErrorInstance.toString();
				done();
			});

			it('should return a JSON string representation of the error', () => {
				return expect(result).to.equal(
					'{"code":1234,"message":"Peer failed...","description":"Something went wrong."}'
				);
			});
		});
	});
});
