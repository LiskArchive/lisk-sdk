/* eslint-disable mocha/no-pending-tests, mocha/no-skipped-tests */
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

var rewire = require('rewire');

var httpApi = rewire('../../../helpers/http_api');

var validUrl = 'api/url';
var validOriginalUrl = 'org/url';
var validMethod = 'GET';
var validIp = '127.0.0.1';
var validNextSpy;
var validSendObject;
var validError;
var validReq;
var validRes;
var spyConsoleTrace;
var resMock;
var loggerMock;
var checkIpInListStub;

describe('httpApi', () => {
	before(done => {
		validError = {
			message: 'validError',
			toJson: sinonSandbox.stub(),
		};
		done();
	});

	describe('middleware', () => {
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
			validNextSpy.reset();
			spyConsoleTrace.reset();
			done();
		});

		after(done => {
			loggerMock.trace.reset();
			loggerMock.log.reset();
			loggerMock.error.reset();
			resMock.header.reset();
			resMock.status.reset();
			resMock.send.reset();
			done();
		});

		describe('errorLogger', () => {
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

			describe('when error is null', () => {
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

			describe('when error is not null', () => {
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

		describe('logClientConnections', () => {
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

			it('should call logger.log with string "GET req/url from 127.0.0.1"', done => {
				expect(loggerMock.log.calledWith('GET req/url from 127.0.0.1'));
				done();
			});

			it('should call next function', done => {
				expect(validNextSpy.calledOnce).to.be.true;
				done();
			});
		});

		describe('attachResponseHeader', () => {
			var validHeaderKey;
			var validHeaderValue;

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

		describe('applyAPIAccessRules', () => {
			var validConfig;

			before(done => {
				validConfig = {
					peers: {
						enabled: true,
						access: { blacklist: [] },
					},
					api: {
						enabled: true,
						access: {
							public: true,
							whiteList: ['127.0.0.1'],
						},
					},
				};
				done();
			});

			beforeEach(done => {
				checkIpInListStub = sinonSandbox.stub();
				httpApi.__set__('checkIpInList', checkIpInListStub);

				httpApi.middleware.applyAPIAccessRules(
					validConfig,
					validReq,
					resMock,
					validNextSpy
				);
				done();
			});

			describe('when req.url matches regex(/^\\/peer[\\/]?.*!/)', () => {
				before(done => {
					validReq.url = '/peer/.';
					done();
				});

				it('should call checkIpInList with parameters: config.peers.access.blackList, req.ip, false', done => {
					expect(checkIpInListStub).to.be.calledOnce;
					expect(checkIpInListStub).to.be.calledWith(
						validConfig.api.access.blacklist,
						validReq.ip,
						false
					);
					done();
				});

				describe('when config.peers.enabled = true and checkIpInList() = false', () => {
					it('should call rejectDisallowed with "true" and "true" as argument');
				});

				describe('when config.peers.enabled = false', () => {
					it(
						'should call rejectDisallowed with "false" and "false" as arguments'
					);
				});

				describe('when checkIpInList() = true and config.peers.enabled = true', () => {
					it(
						'should call rejectDisallowed with "false" and "true" as arguments'
					);
				});
			});

			describe('when req.url does not match regex(/^\\/peer[\\/]?.*!/)', () => {
				it(
					'should call checkIpInList with parameters: config.peers.access.blackList, req.ip, false'
				);

				describe('when config.api.enabled = true and checkIpInList() = true and config.api.access.public = false', () => {
					it(
						'should call rejectDisallowed with "true" and "true" as arguments'
					);
				});

				describe('when config.api.enabled = true and config.api.access.public = true and checkIpInList() = false', () => {
					it(
						'should call rejectDisallowed with "true" and "true" as arguments'
					);
				});

				describe('when config.api.enabled = false', () => {
					it('should call rejectDisallowed "false" and "false"');
				});

				describe('when config.api.enabled.public = true and checkIpInList() = false and config.api.access = false', () => {
					it('should call rejectDisallowed "false" and "true"');
				});
			});
		});

		describe('queryParser', () => {});
	});
});
