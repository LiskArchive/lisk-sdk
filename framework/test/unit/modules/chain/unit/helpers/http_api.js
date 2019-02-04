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
const apiCodes = require('../../../../../../src/modules/chain/helpers/api_codes');

const httpApi = rewire('../../../../../../src/modules/chain/helpers/http_api');

const validUrl = 'api/url';
const validOriginalUrl = 'org/url';
const validMethod = 'GET';
const validIp = '127.0.0.1';
let validNextSpy;
let validSendObject;
let validError;
let validReq;
let validRes;
let spyConsoleTrace;
let resMock;
let loggerMock;
let checkIpInListStub;

describe('httpApi', async () => {
	before(done => {
		validError = {
			message: 'validError',
			toJson: sinonSandbox.stub(),
		};
		done();
	});

	describe('middleware', async () => {
		before(done => {
			validSendObject = {
				success: false,
				error: `API error: ${validError.message}`,
			};
			validNextSpy = sinonSandbox.spy();
			spyConsoleTrace = sinonSandbox.spy(console, 'trace');
			checkIpInListStub = sinonSandbox.spy();

			loggerMock = {
				trace: sinonSandbox.spy(),
				debug: sinonSandbox.spy(),
				info: sinonSandbox.spy(),
				log: sinonSandbox.spy(),
				warn: sinonSandbox.spy(),
				error: sinonSandbox.spy(),
			};
			validReq = {
				url: validUrl,
				originalUrl: validOriginalUrl,
				method: validMethod,
				ip: validIp,
				sanitize: sinonSandbox.stub(),
				match: sinonSandbox.stub(),
			};
			resMock = {
				header: sinonSandbox.stub(),
				status: sinonSandbox.stub(),
				send: sinonSandbox.stub(),
				setHeader: sinonSandbox.stub(),
			};
			resMock.status.returns(resMock);
			done();
		});

		afterEach(done => {
			validNextSpy.resetHistory();
			spyConsoleTrace.resetHistory();
			done();
		});

		after(done => {
			loggerMock.trace.resetHistory();
			loggerMock.log.resetHistory();
			loggerMock.error.resetHistory();
			resMock.header.resetHistory();
			resMock.status.resetHistory();
			resMock.send.resetHistory();
			done();
		});

		describe('errorLogger', async () => {
			beforeEach(done => {
				httpApi.middleware.errorLogger(
					loggerMock,
					validError,
					validReq,
					resMock,
					validNextSpy
				);
				done();
			});

			describe('when error is null', async () => {
				before(done => {
					validError = null;
					done();
				});

				it('should never call logger.error', done => {
					expect(loggerMock.error.notCalled).to.be.true;
					done();
				});

				it('should call next()', done => {
					expect(validNextSpy.calledOnce).to.be.true;
					done();
				});
			});

			describe('when error is not null', async () => {
				before(done => {
					validError = { message: 'validError' };
					done();
				});

				it('should call logger.error with "API error: validError"', done => {
					expect(
						loggerMock.error.calledWith(
							`API error ${validReq.url}`,
							validError.message
						)
					).to.be.true;
					done();
				});

				it('should call logger.trace with error', done => {
					expect(loggerMock.trace.calledWith(validError)).to.be.true;
					done();
				});

				it('should send status 500 and error-object', done => {
					expect(resMock.status.calledWith(500)).to.be.true;
					expect(resMock.status().send.calledWith(validSendObject)).to.be.true;
					done();
				});
			});
		});

		describe('logClientConnections', async () => {
			before(done => {
				validRes = null;
				done();
			});

			beforeEach(done => {
				httpApi.middleware.logClientConnections(
					loggerMock,
					validReq,
					validRes,
					validNextSpy
				);
				done();
			});

			it('should call logger.log with string "GET api/url from 127.0.0.1"', done => {
				expect(loggerMock.log.calledWith('GET api/url from 127.0.0.1')).to.be
					.true;
				done();
			});

			it('should call next function', done => {
				expect(validNextSpy.calledOnce).to.be.true;
				done();
			});
		});

		describe('attachResponseHeader', async () => {
			let validHeaderKey;
			let validHeaderValue;

			before(done => {
				validHeaderKey = 'key';
				validHeaderValue = 'value';
				validSendObject = { success: false, error: 'API endpoint not found' };
				done();
			});

			beforeEach(done => {
				httpApi.middleware.attachResponseHeader(
					validHeaderKey,
					validHeaderValue,
					validReq,
					resMock,
					validNextSpy
				);
				done();
			});

			it('should attach provided key and value to a response-header', done => {
				expect(resMock.setHeader.calledWith(validHeaderKey, validHeaderValue))
					.to.be.true;
				done();
			});

			it('should call next function', done => {
				expect(validNextSpy.calledOnce).to.be.true;
				done();
			});
		});

		describe('applyAPIAccessRules', async () => {
			let validConfig;

			beforeEach(done => {
				validConfig = {
					api: {
						enabled: true,
						access: {
							public: true,
							whiteList: ['127.0.0.1'],
						},
					},
				};
				checkIpInListStub = sinonSandbox.stub();
				httpApi.__set__('checkIpInList', checkIpInListStub);
				done();
			});

			it('should respond with error if api is not enabled', done => {
				validConfig.api.enabled = false;

				httpApi.middleware.applyAPIAccessRules(
					validConfig,
					validReq,
					resMock,
					validNextSpy
				);

				expect(validNextSpy).to.be.not.called;
				expect(resMock.status.calledWith(apiCodes.FORBIDDEN)).to.be.true;
				expect(resMock.send).to.be.calledWith({
					message: 'API access disabled',
					errors: ['API is not enabled in this node.'],
				});
				done();
			});

			it('should respond with success if api is enabled and public', done => {
				validConfig.api.enabled = true;
				validConfig.api.access.public = true;

				httpApi.middleware.applyAPIAccessRules(
					validConfig,
					validReq,
					resMock,
					validNextSpy
				);
				expect(validNextSpy).to.be.calledOnce;
				expect(validNextSpy.firstCall.args).to.be.empty;
				done();
			});

			it('should check for IP and respond with success if api is not public and IP is whitelisted', done => {
				validConfig.api.access.public = false;
				validConfig.api.access.whiteList = ['192.168.99.100'];
				validReq.ip = '192.168.99.100';
				checkIpInListStub.returns(true);

				httpApi.middleware.applyAPIAccessRules(
					validConfig,
					validReq,
					resMock,
					validNextSpy
				);

				expect(checkIpInListStub).to.be.calledOnce;
				expect(checkIpInListStub).to.be.calledWith(
					['192.168.99.100'],
					'192.168.99.100'
				);
				expect(validNextSpy).to.be.calledOnce;
				expect(validNextSpy.firstCall.args).to.be.empty;
				done();
			});

			it('should check for IP and respond with error if api is not public and IP is whitelisted', done => {
				validConfig.api.access.public = false;
				validConfig.api.access.whiteList = ['192.168.99.100'];
				validReq.ip = '192.168.99.101';
				checkIpInListStub.returns(false);

				httpApi.middleware.applyAPIAccessRules(
					validConfig,
					validReq,
					resMock,
					validNextSpy
				);

				expect(checkIpInListStub).to.be.calledOnce;
				expect(checkIpInListStub).to.be.calledWith(
					['192.168.99.100'],
					'192.168.99.101'
				);
				expect(validNextSpy).to.be.not.called;
				expect(resMock.status.calledWith(apiCodes.FORBIDDEN)).to.be.true;
				expect(resMock.send).to.be.calledWith({
					message: 'API access denied',
					errors: ['API access blocked.'],
				});
				done();
			});
		});

		describe('queryParser', async () => {});
	});
});
