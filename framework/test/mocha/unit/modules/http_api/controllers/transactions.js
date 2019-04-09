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

const TransactionsController = rewire(
	'../../../../../../src/modules/http_api/controllers/transactions'
);

describe('transactions/api', () => {
	let postTransaction;
	let storage;
	let channelStub;
	let storageStub;
	const contextStub = {
		request: {
			swagger: {
				params: {
					transaction: {
						value: sinonSandbox.stub().returns({}),
					},
				},
			},
		},
	};

	beforeEach(async () => {
		storageStub = {
			entities: {
				Block: {
					get: sinonSandbox.stub().resolves([]),
				},
			},
		};

		new TransactionsController({
			components: { storage: storageStub },
			channel: channelStub,
		});

		postTransaction = TransactionsController.postTransaction;
		storage = TransactionsController.__get__('storage');
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign channel', async () =>
			expect(TransactionsController.__get__('channel')).to.equal(channelStub));

		it('should assign storage component', async () =>
			expect(storage).to.equal(storageStub));
	});

	describe('postTransaction', () => {
		describe('when err.message = "Processing error"', () => {
			beforeEach(async () => {
				channelStub = TransactionsController.__set__('channel', {
					invoke: sinonSandbox.stub().resolves({
						success: false,
						message: 'Processing error',
					}),
				});
			});

			it('should call callback with ApiError', async () =>
				postTransaction(contextStub, err =>
					expect(err).to.be.instanceof(ApiError)
				));

			it('should call callback with ApiError containing code = 409', async () =>
				postTransaction(contextStub, err =>
					expect(err.code).to.equal(apiCodes.PROCESSING_ERROR)
				));
		});

		describe('when internal processing error"', () => {
			beforeEach(async () => {
				channelStub = TransactionsController.__set__('channel', {
					invoke: sinonSandbox.stub().throws(),
				});
			});

			it('should call callback with ApiError containing code = 500', async () =>
				postTransaction(contextStub, err =>
					expect(err.code).to.equal(apiCodes.INTERNAL_SERVER_ERROR)
				));
		});

		describe('when transaction accepted', () => {
			beforeEach(async () => {
				channelStub = TransactionsController.__set__('channel', {
					invoke: sinonSandbox.stub().resolves({ success: true }),
				});
			});

			it('should call callback with success data', async () =>
				postTransaction(contextStub, (err, resp) =>
					expect(resp.data.message).to.equal('Transaction(s) accepted')
				));
		});
	});
});
