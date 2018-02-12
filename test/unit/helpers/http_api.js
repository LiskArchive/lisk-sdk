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

var httpApi = require('../../../helpers/http_api');
const apiCodes = require('../../../helpers/api_codes');

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
	before(() => {
		validError = {
			message: 'validError',
			toJson: sinonSandbox.stub(),
		};
	});

	describe('middleware', () => {
		before(() => {
			validSendObject = {
				success: false,
				error: `API error: ${validError.message}`,
			};
			validNextSpy = sinonSandbox.spy();
			spyConsoleTrace = sinonSandbox.spy(console, 'trace');

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
		});

		afterEach(() => {
			validNextSpy.reset();
			spyConsoleTrace.reset();
		});

		after(() => {
			loggerMock.trace.reset();
			loggerMock.log.reset();
			loggerMock.error.reset();
			resMock.header.reset();
			resMock.status.reset();
			resMock.send.reset();
		});

		describe('cors', () => {
			beforeEach(() => {
				httpApi.middleware.cors(validReq, resMock, validNextSpy);
			});

			it('should call res.header with "Access-Control-Allow-Origin" and "*"', () => {
				expect(
					resMock.header.calledWith('Access-Control-Allow-Origin', '*')
				).to.eql(true);
			});

			it('should call res.header "Access-Control-Allow-Headers" and "Origin, X-Objected-With, Content-Type, Accept"', () => {
				expect(
					resMock.header.calledWith(
						'Access-Control-Allow-Headers',
						'Origin, X-Objected-With, Content-Type, Accept'
					)
				).to.eql(true);
			});

			it('should call next()', () => {
				expect(validNextSpy.calledOnce).to.be.true;
			});
		});

		describe('errorLogger', () => {
			beforeEach(() => {
				httpApi.middleware.errorLogger(
					loggerMock,
					validError,
					validReq,
					resMock,
					validNextSpy
				);
			});

			describe('when error is null', () => {
				before(() => {
					validError = null;
				});

				it('should never call logger.error', () => {
					expect(loggerMock.error.notCalled).to.be.true;
				});

				it('should call next()', () => {
					expect(validNextSpy.calledOnce).to.be.true;
				});
			});

			describe('when error is not null', () => {
				before(() => {
					validError = { message: 'validError' };
				});

				it('should call logger.error with "API error: validError"', () => {
					expect(
						loggerMock.error.calledWith(
							`API error ${validReq.url}`,
							validError.message
						)
					).to.be.true;
				});

				it('should call console.trace with error', () => {
					expect(spyConsoleTrace.calledOnce).to.be.true;
				});

				it('should send status 500 and error-object', () => {
					expect(resMock.status.calledWith(500)).to.be.true;
					expect(resMock.status().send.calledWith(validSendObject)).to.be.true;
				});
			});
		});

		describe('logClientConnections', () => {
			before(() => {
				validRes = null;
			});

			beforeEach(() => {
				httpApi.middleware.logClientConnections(
					loggerMock,
					validReq,
					validRes,
					validNextSpy
				);
			});

			it('should call logger.log with string "GET req/url from 127.0.0.1"', () => {
				expect(loggerMock.log.calledWith('GET req/url from 127.0.0.1'));
			});

			it('should call next function', () => {
				expect(validNextSpy.calledOnce).to.be.true;
			});
		});

		describe('blockchainReady', () => {
			var validIsLoaded;

			before(() => {
				validIsLoaded = sinonSandbox.stub();
				validSendObject = { success: false, error: 'Blockchain is loading' };
			});

			beforeEach(() => {
				httpApi.middleware.blockchainReady(
					validIsLoaded,
					validReq,
					resMock,
					validNextSpy
				);
			});

			describe('when isLoaded returns true', () => {
				before(() => {
					validIsLoaded.returns(true);
				});

				it('should call next function', () => {
					expect(validNextSpy.calledOnce).to.be.true;
				});
			});

			describe('when isLoaded returns false', () => {
				before(() => {
					validIsLoaded.returns(false);
				});

				it('should send status 500 and error-object', () => {
					expect(resMock.status.calledWith(500)).to.be.true;
					expect(resMock.status().send.calledWith(validSendObject)).to.be.true;
				});
			});
		});

		describe('notFound', () => {
			before(() => {
				validSendObject = { success: false, error: 'API endpoint not found' };
			});

			beforeEach(() => {
				httpApi.middleware.notFound(validReq, resMock, validNextSpy);
			});

			it('should send status 500 and error-object', () => {
				expect(resMock.status.calledWith(500)).to.be.true;
				expect(resMock.status().send.calledWith(validSendObject)).to.be.true;
			});
		});

		describe('sanitize', () => {
			var validProperty;
			var validSchema;
			var validCbSpy;
			var sanitizeResultFunction;

			before(() => {
				validProperty = 'url';
				validSchema = null;
				validCbSpy = sinonSandbox.spy();
			});

			beforeEach(() => {
				sanitizeResultFunction = httpApi.middleware.sanitize(
					validProperty,
					validSchema,
					validCbSpy
				);
			});

			it('should return a function', () => {
				expect(sanitizeResultFunction).to.be.a('function');
			});

			describe('when sanitize result is called', () => {
				var validReqMock;
				var validSanitizeError;
				var validSanitizeReport;
				var validSanitizeSanitized;
				var validValue = 'validValue';
				var validSanitizeCallback;

				before(() => {
					validRes = {
						json: sinonSandbox.stub(),
					};
					validSanitizeReport = { isValid: true };
					validReqMock = {
						sanitize: sinonSandbox.stub(),
					};
					validReqMock.sanitize.yields(
						validSanitizeError,
						validSanitizeReport,
						validSanitizeSanitized
					);
					validReqMock[validProperty] = validValue;
					validSanitizeCallback = sinonSandbox.stub();
				});

				beforeEach(() => {
					sanitizeResultFunction(validReqMock, validRes, validSanitizeCallback);
				});

				it('should call req.sanitize with req[property], schema and cb as arguments', () => {
					expect(
						validReqMock.sanitize.calledWith(
							validReqMock[validProperty],
							validSchema
						)
					).to.be.true;
				});

				describe('when report.isValid = false', () => {
					before(() => {
						validSanitizeReport.isValid = false;
					});

					it('should call res.json', () => {
						expect(validCbSpy.called).to.be.true;
					});
				});

				describe('when report.isValid = true', () => {
					before(() => {
						validSanitizeReport.isValid = true;
					});

					it('should call callback', () => {
						expect(validCbSpy.called).to.be.true;
					});
				});
			});
		});

		describe('attachResponseHeader', () => {
			var validHeaderKey;
			var validHeaderValue;

			before(() => {
				validHeaderKey = 'key';
				validHeaderValue = 'value';
				validSendObject = { success: false, error: 'API endpoint not found' };
			});

			beforeEach(() => {
				httpApi.middleware.attachResponseHeader(
					validHeaderKey,
					validHeaderValue,
					validReq,
					resMock,
					validNextSpy
				);
			});

			it('should attach provided key and value to a response-header', () => {
				expect(resMock.setHeader.calledWith(validHeaderKey, validHeaderValue))
					.to.be.true;
			});

			it('should call next function', () => {
				expect(validNextSpy.calledOnce).to.be.true;
			});
		});

		describe.skip('applyAPIAccessRules', () => {
			var validConfig;

			before(() => {
				validConfig = {
					peers: {
						enabled: true,
						access: { blacklist: [] },
					},
					api: sinonSandbox.stub(),
				};
			});

			beforeEach(() => {
				httpApi.middleware.applyAPIAccessRules(
					validConfig,
					validReq,
					resMock,
					validNextSpy
				);
			});

			describe('when req.url matches regex(/^\\/peer[\\/]?.*!/)', () => {
				before(() => {
					validReq.url = '/peer/.';
				});

				it('should call checkIpInList with parameters: config.peers.access.blackList, req.ip, false', () => {
					sinonSandbox.assert.called(checkIpInListStub);
					expect(
						checkIpInListStub.calledWith(
							validConfig.peers.access.blacklist,
							validReq.ip,
							false
						)
					).to.be.true;
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

		describe.skip('useCache', () => {
			var validCache;
			var validCachedValue;
			var validErr;

			before(() => {
				validCache = {
					isReady: sinonSandbox.stub(),
					getJsonForKey: sinonSandbox.stub(),
					setJsonForKey: sinonSandbox.stub(),
				};
				validRes = {};
				validErr = 'error';
				validCachedValue = 'cachedValue';
			});

			beforeEach(() => {
				httpApi.middleware.useCache(
					loggerMock,
					validCache,
					validReq,
					validRes,
					validNextSpy
				);
			});

			afterEach(() => {
				loggerMock.debug.reset();
			});

			describe('when cache.isReady() = false', () => {
				before(() => {
					validCache.isReady.returns(false);
				});

				it('should call next function', () => {
					expect(validNextSpy.calledOnce).to.be.true;
				});
			});

			describe('when cache.isReady() = true', () => {
				before(() => {
					validCache.isReady.returns(true);
					validCache.getJsonForKey.yields(validErr, validCachedValue);
				});

				it('should call cache.getJsonForKey with key = req.originalUrl', () => {
					expect(validCache.getJsonForKey.calledWith(validReq.originalUrl)).to
						.be.true;
				});

				describe('when err = true', () => {
					before(() => {
						validErr = true;
					});

					it('should add json function to response', () => {
						expect(validRes.json).to.be.a('function');
					});

					// Not tested, because defined function is not executed at this point
					describe.skip('when res.statusCode = 200 (OK)', () => {
						before(() => {
							validRes.statusCode = 200;
						});

						it('should call logger.debug with "cached response for key: api/url"', () => {
							expect(
								loggerMock.debug.calledWith('cached response for key: api/url')
							).to.be.true;
						});

						it('should call cache.setJsonForKey with key, response as arguments', () => {
							// expect(validCache.setJsonForKey.calledWith(validReq.url, validCachedValue));
							expect(
								validCache.setJsonForKey.calledWith(
									validReq.url,
									validCachedValue
								)
							).to.be.true;
						});
					});

					it('should call next function', () => {
						expect(validNextSpy.calledOnce).to.be.true;
					});
				});

				describe('when cachedValue  = false', () => {
					before(() => {
						validCachedValue = false;
					});

					it('should add json function to response', () => {
						expect(validRes.json).to.be.a('function');
					});

					it('should call next function', () => {
						expect(validNextSpy.calledOnce).to.be.true;
					});
				});

				describe('when cachedValue = true and err = false', () => {
					before(() => {
						validCachedValue = 'cachedValue';
						validErr = false;
						validRes = {
							json: sinonSandbox.stub(),
						};
						validRes.json.withArgs(validCachedValue);
						validCache.getJsonForKey.yields(validErr, validCachedValue);
					});

					it('should call logger.debug', () => {
						expect(loggerMock.debug.called).to.be.true;
					});

					it('should call res.json with cachedValue', () => {
						expect(validRes.json.calledWith(validCachedValue)).to.be.true;
					});
				});
			});
		});
	});

	describe('respond', () => {
		var validResponse = {};

		before(() => {
			validRes = {
				json: sinonSandbox.stub(),
			};
		});

		beforeEach(() => {
			httpApi.respond(validRes, validError, validResponse);
		});

		afterEach(() => {
			validRes.json.reset();
		});

		describe('when error is defined', () => {
			it('should call res.json with {"success": false, "error": err}', () => {
				expect(validRes.json.calledWith({ success: false, error: validError }))
					.to.be.true;
			});
		});

		describe('when error is undefined', () => {
			before(() => {
				validError = null;
			});

			it('should call res.json with extend({}, {"success": true}, response)', () => {
				validResponse.success = true;
				expect(validRes.json.calledWith(validResponse)).to.be.true;
			});
		});
	});

	describe('respondWithCode', () => {
		var validResponse;

		before(() => {
			validResponse = {
				data: [],
			};
			validError = {
				message: 'validError',
				toJson: sinonSandbox.stub(),
			};

			validRes = {
				json: sinonSandbox.stub(),
				status: sinonSandbox.stub(),
			};
			validRes.status.returns(validRes);
		});

		beforeEach(() => {
			httpApi.respondWithCode(validRes, validError, validResponse);
		});

		afterEach(() => {
			validRes.json.reset();
		});

		describe('when error is defined', () => {
			before(() => {
				validError = {
					message: 'validError',
					toJson: sinonSandbox.stub(),
				};
			});

			it('should call res.status(500).json() with error in json format', () => {
				var tmp_error = validError.code
					? validError.code
					: apiCodes.INTERNAL_SERVER_ERROR;

				expect(validRes.status.calledWith(tmp_error)).to.be.true;
				expect(validRes.json.calledOnce).to.be.true;
			});
		});

		describe('when error is undefined', () => {
			before(() => {
				validError = null;
			});

			describe('when response is empty', () => {
				it('should call res.status with code = 204 and res.json', () => {
					expect(validRes.status.calledWith(apiCodes.EMPTY_RESOURCES_OK)).to.be
						.true;
					expect(validRes.json.calledOnce).to.be.true;
				});
			});

			describe('when response is not empty', () => {
				before(() => {
					validResponse = {
						data: [1, 2, 3],
					};
				});

				it('should call res.status with code = 200 and res.json', () => {
					expect(validRes.status.calledWith(apiCodes.OK)).to.be.true;
					expect(validRes.json.calledOnce).to.be.true;
				});
			});
		});
	});

	describe('registerEndpoint', () => {
		var validRoute;
		var validApp;
		var validRouter;
		var validIsLoaded;

		before(() => {
			validRoute = null;
			validApp = {
				use: sinonSandbox.stub(),
			};
			validRouter = {
				use: sinonSandbox.stub(),
			};
			validIsLoaded = true;
		});

		beforeEach(() => {
			httpApi.registerEndpoint(
				validRoute,
				validApp,
				validRouter,
				validIsLoaded
			);
		});

		it('should call router.use with middleware.notFound', () => {
			expect(validRouter.use.calledWith(httpApi.middleware.notFound)).to.be
				.true;
		});

		it('should call router.use with middleware.blockchainReady.bind(null, validIsLoaded)', () => {
			expect(validRouter.use.args[1][0].toString()).to.equal(
				httpApi.middleware.blockchainReady.bind(null, validIsLoaded).toString()
			);
		});

		it('should call app.use with route and router as arguments', () => {
			expect(validApp.use.calledWith(validRoute, validRouter));
		});
	});
});
