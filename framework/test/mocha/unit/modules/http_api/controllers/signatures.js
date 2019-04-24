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
const apiCodes = require('../../../../../../src/modules/http_api/api_codes');
const ApiError = require('../../../../../../src/modules/http_api/api_error');

const SignaturesController = rewire(
	'../../../../../../src/modules/http_api/controllers/signatures'
);

describe('signatures/api', () => {
	let postSignature;
	let channelStub;
	const contextStub = {
		request: {
			swagger: {
				params: {
					signature: {
						value: sinonSandbox.stub().returns({}),
					},
				},
			},
		},
	};

	beforeEach(async () => {
		new SignaturesController({
			channel: channelStub,
		});

		postSignature = SignaturesController.postSignature;
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign channel', async () =>
			expect(SignaturesController.__get__('channel')).to.equal(channelStub));
	});

	describe('postSignature', () => {
		describe('when err.message = "Error processing signature"', () => {
			beforeEach(async () => {
				channelStub = SignaturesController.__set__('channel', {
					invoke: sinonSandbox.stub().resolves({
						success: false,
						message:
							'Error processing signature: Unable to process signature, corresponding transaction not found',
					}),
				});
			});

			it('should call callback with ApiError', async () =>
				postSignature(contextStub, err =>
					expect(err).to.be.instanceof(ApiError)
				));

			it('should call callback with ApiError containing code = 409', async () =>
				postSignature(contextStub, err =>
					expect(err.code).to.equal(apiCodes.PROCESSING_ERROR)
				));
		});

		describe('when err.message = "Invalid signature body"', () => {
			beforeEach(async () => {
				channelStub = SignaturesController.__set__('channel', {
					invoke: sinonSandbox
						.stub()
						.resolves({ success: false, message: 'Invalid signature body' }),
				});
			});

			it('should call callback with ApiError containing code = 400', async () =>
				postSignature(contextStub, err =>
					expect(err.code).to.equal(apiCodes.BAD_REQUEST)
				));
		});

		describe('when internal processing error"', () => {
			beforeEach(async () => {
				channelStub = SignaturesController.__set__('channel', {
					invoke: sinonSandbox
						.stub()
						.resolves({ success: false, message: 'Bad stuff happened' }),
				});
			});

			it('should call callback with ApiError containing code = 500', async () =>
				postSignature(contextStub, err =>
					expect(err.code).to.equal(apiCodes.INTERNAL_SERVER_ERROR)
				));
		});

		describe('when invoke function fails unexpectedly"', () => {
			beforeEach(async () => {
				channelStub = SignaturesController.__set__('channel', {
					invoke: sinonSandbox.stub().throws(),
				});
			});

			it('should call callback with ApiError containing code = 500', async () =>
				postSignature(contextStub, err => {
					expect(err).to.be.instanceof(ApiError);
					expect(err.code).to.equal(apiCodes.INTERNAL_SERVER_ERROR);
				}));
		});

		describe('when signature successful accepted', () => {
			beforeEach(async () => {
				channelStub = SignaturesController.__set__('channel', {
					invoke: sinonSandbox.stub().resolves({ success: true }),
				});
			});

			it('should call callback with success data', async () =>
				postSignature(contextStub, (err, resp) =>
					expect(resp.data.message).to.equal('Signature Accepted')
				));
		});
	});
});
