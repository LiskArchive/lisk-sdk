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

describe('httpApi', function() {
	before(function() {
		validError = {
			message: 'validError',
			toJson: sinonSandbox.stub(),
		};
	});

	describe('middleware', function() {
		before(function() {
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

		afterEach(function() {
			validNextSpy.reset();
			spyConsoleTrace.reset();
		});

		after(function() {
			loggerMock.trace.reset();
			loggerMock.log.reset();
			loggerMock.error.reset();
			resMock.header.reset();
			resMock.status.reset();
			resMock.send.reset();
		});

		describe('cors', function() {
			beforeEach(function() {
				httpApi.middleware.cors(validReq, resMock, validNextSpy);
			});

			it('should call res.header with "Access-Control-Allow-Origin" and "*"', function() {
				expect(
					resMock.header.calledWith('Access-Control-Allow-Origin', '*')
				).to.eql(true);
			});

			it('should call res.header "Access-Control-Allow-Headers" and "Origin, X-Objected-With, Content-Type, Accept"', function() {
				expect(
					resMock.header.calledWith(
						'Access-Control-Allow-Headers',
						'Origin, X-Objected-With, Content-Type, Accept'
					)
				).to.eql(true);
			});

			it('should call next()', function() {
				expect(validNextSpy.calledOnce).to.be.true;
			});
		});

		describe('errorLogger', function() {
			beforeEach(function() {
				httpApi.middleware.errorLogger(
					loggerMock,
					validError,
					validReq,
					resMock,
					validNextSpy
				);
			});

			describe('when error is null', function() {
				before(function() {
					validError = null;
				});

				it('should never call logger.error', function() {
					expect(loggerMock.error.notCalled).to.be.true;
				});

				it('should call next()', function() {
					expect(validNextSpy.calledOnce).to.be.true;
				});
			});

			describe('when error is not null', function() {
				before(function() {
					validError = { message: 'validError' };
				});

				it('should call logger.error with "API error: validError"', function() {
					expect(
						loggerMock.error.calledWith(
							`API error ${validReq.url}`,
							validError.message
						)
					).to.be.true;
				});

				it('should call console.trace with error', function() {
					expect(spyConsoleTrace.calledOnce).to.be.true;
				});

				it('should send status 500 and error-object', function() {
					expect(resMock.status.calledWith(500)).to.be.true;
					expect(resMock.status().send.calledWith(validSendObject)).to.be.true;
				});
			});
		});

		describe('logClientConnections', function() {
			before(function() {
				validRes = null;
			});

			beforeEach(function() {
				httpApi.middleware.logClientConnections(
					loggerMock,
					validReq,
					validRes,
					validNextSpy
				);
			});

			it('should call logger.log with string "GET req/url from 127.0.0.1"', function() {
				expect(loggerMock.log.calledWith('GET req/url from 127.0.0.1'));
			});

			it('should call next function', function() {
				expect(validNextSpy.calledOnce).to.be.true;
			});
		});

		describe('blockchainReady', function() {
			var validIsLoaded;

			before(function() {
				validIsLoaded = sinonSandbox.stub();
				validSendObject = { success: false, error: 'Blockchain is loading' };
			});

			beforeEach(function() {
				httpApi.middleware.blockchainReady(
					validIsLoaded,
					validReq,
					resMock,
					validNextSpy
				);
			});

			describe('when isLoaded returns true', function() {
				before(function() {
					validIsLoaded.returns(true);
				});

				it('should call next function', function() {
					expect(validNextSpy.calledOnce).to.be.true;
				});
			});

			describe('when isLoaded returns false', function() {
				before(function() {
					validIsLoaded.returns(false);
				});

				it('should send status 500 and error-object', function() {
					expect(resMock.status.calledWith(500)).to.be.true;
					expect(resMock.status().send.calledWith(validSendObject)).to.be.true;
				});
			});
		});

		describe('notFound', function() {
			before(function() {
				validSendObject = { success: false, error: 'API endpoint not found' };
			});

			beforeEach(function() {
				httpApi.middleware.notFound(validReq, resMock, validNextSpy);
			});

			it('should send status 500 and error-object', function() {
				expect(resMock.status.calledWith(500)).to.be.true;
				expect(resMock.status().send.calledWith(validSendObject)).to.be.true;
			});
		});

		describe('sanitize', function() {
			var validProperty;
			var validSchema;
			var validCbSpy;
			var sanitizeResultFunction;

			before(function() {
				validProperty = 'url';
				validSchema = null;
				validCbSpy = sinonSandbox.spy();
			});

			beforeEach(function() {
				sanitizeResultFunction = httpApi.middleware.sanitize(
					validProperty,
					validSchema,
					validCbSpy
				);
			});

			it('should return a function', function() {
				expect(sanitizeResultFunction).to.be.a('function');
			});

			describe('when sanitize result is called', function() {
				var validReqMock;
				var validSanitizeError;
				var validSanitizeReport;
				var validSanitizeSanitized;
				var validValue = 'validValue';
				var validSanitizeCallback;

				before(function() {
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

				beforeEach(function() {
					sanitizeResultFunction(validReqMock, validRes, validSanitizeCallback);
				});

				it('should call req.sanitize with req[property], schema and cb as arguments', function() {
					expect(
						validReqMock.sanitize.calledWith(
							validReqMock[validProperty],
							validSchema
						)
					).to.be.true;
				});

				describe('when report.isValid = false', function() {
					before(function() {
						validSanitizeReport.isValid = false;
					});

					it('should call res.json', function() {
						expect(validCbSpy.called).to.be.true;
					});
				});

				describe('when report.isValid = true', function() {
					before(function() {
						validSanitizeReport.isValid = true;
					});

					it('should call callback', function() {
						expect(validCbSpy.called).to.be.true;
					});
				});
			});
		});

		describe('attachResponseHeader', function() {
			var validHeaderKey;
			var validHeaderValue;

			before(function() {
				validHeaderKey = 'key';
				validHeaderValue = 'value';
				validSendObject = { success: false, error: 'API endpoint not found' };
			});

			beforeEach(function() {
				httpApi.middleware.attachResponseHeader(
					validHeaderKey,
					validHeaderValue,
					validReq,
					resMock,
					validNextSpy
				);
			});

			it('should attach provided key and value to a response-header', function() {
				expect(resMock.setHeader.calledWith(validHeaderKey, validHeaderValue))
					.to.be.true;
			});

			it('should call next function', function() {
				expect(validNextSpy.calledOnce).to.be.true;
			});
		});

		describe.skip('applyAPIAccessRules', function() {
			var validConfig;

			before(function() {
				validConfig = {
					peers: {
						enabled: true,
						access: { blacklist: [] },
					},
					api: sinonSandbox.stub(),
				};
			});

			beforeEach(function() {
				httpApi.middleware.applyAPIAccessRules(
					validConfig,
					validReq,
					resMock,
					validNextSpy
				);
			});

			describe('when req.url matches regex(/^\\/peer[\\/]?.*!/)', function() {
				before(function() {
					validReq.url = '/peer/.';
				});

				it('should call checkIpInList with parameters: config.peers.access.blackList, req.ip, false', function() {
					sinonSandbox.assert.called(checkIpInListStub);
					expect(
						checkIpInListStub.calledWith(
							validConfig.peers.access.blacklist,
							validReq.ip,
							false
						)
					).to.be.true;
				});

				describe('when config.peers.enabled = true and checkIpInList() = false', function() {
					it('should call rejectDisallowed with "true" and "true" as argument');
				});

				describe('when config.peers.enabled = false', function() {
					it(
						'should call rejectDisallowed with "false" and "false" as arguments'
					);
				});

				describe('when checkIpInList() = true and config.peers.enabled = true', function() {
					it(
						'should call rejectDisallowed with "false" and "true" as arguments'
					);
				});
			});

			describe('when req.url does not match regex(/^\\/peer[\\/]?.*!/)', function() {
				it(
					'should call checkIpInList with parameters: config.peers.access.blackList, req.ip, false'
				);

				describe('when config.api.enabled = true and checkIpInList() = true and config.api.access.public = false', function() {
					it(
						'should call rejectDisallowed with "true" and "true" as arguments'
					);
				});

				describe('when config.api.enabled = true and config.api.access.public = true and checkIpInList() = false', function() {
					it(
						'should call rejectDisallowed with "true" and "true" as arguments'
					);
				});

				describe('when config.api.enabled = false', function() {
					it('should call rejectDisallowed "false" and "false"');
				});

				describe('when config.api.enabled.public = true and checkIpInList() = false and config.api.access = false', function() {
					it('should call rejectDisallowed "false" and "true"');
				});
			});
		});

		describe.skip('useCache', function() {
			var validCache;
			var validCachedValue;
			var validErr;

			before(function() {
				validCache = {
					isReady: sinonSandbox.stub(),
					getJsonForKey: sinonSandbox.stub(),
					setJsonForKey: sinonSandbox.stub(),
				};
				validRes = {};
				validErr = 'error';
				validCachedValue = 'cachedValue';
			});

			beforeEach(function() {
				httpApi.middleware.useCache(
					loggerMock,
					validCache,
					validReq,
					validRes,
					validNextSpy
				);
			});

			afterEach(function() {
				loggerMock.debug.reset();
			});

			describe('when cache.isReady() = false', function() {
				before(function() {
					validCache.isReady.returns(false);
				});

				it('should call next function', function() {
					expect(validNextSpy.calledOnce).to.be.true;
				});
			});

			describe('when cache.isReady() = true', function() {
				before(function() {
					validCache.isReady.returns(true);
					validCache.getJsonForKey.yields(validErr, validCachedValue);
				});

				it('should call cache.getJsonForKey with key = req.originalUrl', function() {
					expect(validCache.getJsonForKey.calledWith(validReq.originalUrl)).to
						.be.true;
				});

				describe('when err = true', function() {
					before(function() {
						validErr = true;
					});

					it('should add json function to response', function() {
						expect(validRes.json).to.be.a('function');
					});

					// Not tested, because defined function is not executed at this point
					describe.skip('when res.statusCode = 200 (OK)', function() {
						before(function() {
							validRes.statusCode = 200;
						});

						it('should call logger.debug with "cached response for key: api/url"', function() {
							expect(
								loggerMock.debug.calledWith('cached response for key: api/url')
							).to.be.true;
						});

						it('should call cache.setJsonForKey with key, response as arguments', function() {
							// expect(validCache.setJsonForKey.calledWith(validReq.url, validCachedValue));
							expect(
								validCache.setJsonForKey.calledWith(
									validReq.url,
									validCachedValue
								)
							).to.be.true;
						});
					});

					it('should call next function', function() {
						expect(validNextSpy.calledOnce).to.be.true;
					});
				});

				describe('when cachedValue  = false', function() {
					before(function() {
						validCachedValue = false;
					});

					it('should add json function to response', function() {
						expect(validRes.json).to.be.a('function');
					});

					it('should call next function', function() {
						expect(validNextSpy.calledOnce).to.be.true;
					});
				});

				describe('when cachedValue = true and err = false', function() {
					before(function() {
						validCachedValue = 'cachedValue';
						validErr = false;
						validRes = {
							json: sinonSandbox.stub(),
						};
						validRes.json.withArgs(validCachedValue);
						validCache.getJsonForKey.yields(validErr, validCachedValue);
					});

					it('should call logger.debug', function() {
						expect(loggerMock.debug.called).to.be.true;
					});

					it('should call res.json with cachedValue', function() {
						expect(validRes.json.calledWith(validCachedValue)).to.be.true;
					});
				});
			});
		});
	});

	describe('respond', function() {
		var validResponse = {};

		before(function() {
			validRes = {
				json: sinonSandbox.stub(),
			};
		});

		beforeEach(function() {
			httpApi.respond(validRes, validError, validResponse);
		});

		afterEach(function() {
			validRes.json.reset();
		});

		describe('when error is defined', function() {
			it('should call res.json with {"success": false, "error": err}', function() {
				expect(validRes.json.calledWith({ success: false, error: validError }))
					.to.be.true;
			});
		});

		describe('when error is undefined', function() {
			before(function() {
				validError = null;
			});

			it('should call res.json with extend({}, {"success": true}, response)', function() {
				validResponse.success = true;
				expect(validRes.json.calledWith(validResponse)).to.be.true;
			});
		});
	});

	describe('respondWithCode', function() {
		var validResponse;

		before(function() {
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

		beforeEach(function() {
			httpApi.respondWithCode(validRes, validError, validResponse);
		});

		afterEach(function() {
			validRes.json.reset();
		});

		describe('when error is defined', function() {
			before(function() {
				validError = {
					message: 'validError',
					toJson: sinonSandbox.stub(),
				};
			});

			it('should call res.status(500).json() with error in json format', function() {
				var tmp_error = validError.code
					? validError.code
					: apiCodes.INTERNAL_SERVER_ERROR;

				expect(validRes.status.calledWith(tmp_error)).to.be.true;
				expect(validRes.json.calledOnce).to.be.true;
			});
		});

		describe('when error is undefined', function() {
			before(function() {
				validError = null;
			});

			describe('when response is empty', function() {
				it('should call res.status with code = 204 and res.json', function() {
					expect(validRes.status.calledWith(apiCodes.EMPTY_RESOURCES_OK)).to.be
						.true;
					expect(validRes.json.calledOnce).to.be.true;
				});
			});

			describe('when response is not empty', function() {
				before(function() {
					validResponse = {
						data: [1, 2, 3],
					};
				});

				it('should call res.status with code = 200 and res.json', function() {
					expect(validRes.status.calledWith(apiCodes.OK)).to.be.true;
					expect(validRes.json.calledOnce).to.be.true;
				});
			});
		});
	});

	describe('registerEndpoint', function() {
		var validRoute;
		var validApp;
		var validRouter;
		var validIsLoaded;

		before(function() {
			validRoute = null;
			validApp = {
				use: sinonSandbox.stub(),
			};
			validRouter = {
				use: sinonSandbox.stub(),
			};
			validIsLoaded = true;
		});

		beforeEach(function() {
			httpApi.registerEndpoint(
				validRoute,
				validApp,
				validRouter,
				validIsLoaded
			);
		});

		it('should call router.use with middleware.notFound', function() {
			expect(validRouter.use.calledWith(httpApi.middleware.notFound)).to.be
				.true;
		});

		it('should call router.use with middleware.blockchainReady.bind(null, validIsLoaded)', function() {
			expect(validRouter.use.args[1][0].toString()).to.equal(
				httpApi.middleware.blockchainReady.bind(null, validIsLoaded).toString()
			);
		});

		it('should call app.use with route and router as arguments', function() {
			expect(validApp.use.calledWith(validRoute, validRouter));
		});
	});
});
