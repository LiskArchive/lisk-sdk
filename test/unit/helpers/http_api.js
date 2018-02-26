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

		describe('cors', () => {
			beforeEach(done => {
				httpApi.middleware.cors(validReq, resMock, validNextSpy);
				done();
			});

			it('should call res.header with "Access-Control-Allow-Origin" and "*"', done => {
				expect(
					resMock.header.calledWith('Access-Control-Allow-Origin', '*')
				).to.eql(true);
				done();
			});

			it('should call res.header "Access-Control-Allow-Headers" and "Origin, X-Objected-With, Content-Type, Accept"', done => {
				expect(
					resMock.header.calledWith(
						'Access-Control-Allow-Headers',
						'Origin, X-Objected-With, Content-Type, Accept'
					)
				).to.eql(true);
				done();
			});

			it('should call next()', done => {
				expect(validNextSpy.calledOnce).to.be.true;
				done();
			});
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

		describe('blockchainReady', () => {
			var validIsLoaded;

			before(done => {
				validIsLoaded = sinonSandbox.stub();
				validSendObject = { success: false, error: 'Blockchain is loading' };
				done();
			});

			beforeEach(done => {
				httpApi.middleware.blockchainReady(
					validIsLoaded,
					validReq,
					resMock,
					validNextSpy
				);
				done();
			});

			describe('when isLoaded returns true', () => {
				before(done => {
					validIsLoaded.returns(true);
					done();
				});

				it('should call next function', done => {
					expect(validNextSpy.calledOnce).to.be.true;
					done();
				});
			});

			describe('when isLoaded returns false', () => {
				before(done => {
					validIsLoaded.returns(false);
					done();
				});

				it('should send status 500 and error-object', done => {
					expect(resMock.status.calledWith(500)).to.be.true;
					expect(resMock.status().send.calledWith(validSendObject)).to.be.true;
					done();
				});
			});
		});

		describe('notFound', () => {
			before(done => {
				validSendObject = { success: false, error: 'API endpoint not found' };
				done();
			});

			beforeEach(done => {
				httpApi.middleware.notFound(validReq, resMock, validNextSpy);
				done();
			});

			it('should send status 500 and error-object', done => {
				expect(resMock.status.calledWith(500)).to.be.true;
				expect(resMock.status().send.calledWith(validSendObject)).to.be.true;
				done();
			});
		});

		describe('sanitize', () => {
			var validProperty;
			var validSchema;
			var validCbSpy;
			var sanitizeResultFunction;

			before(done => {
				validProperty = 'url';
				validSchema = null;
				validCbSpy = sinonSandbox.spy();
				done();
			});

			beforeEach(done => {
				sanitizeResultFunction = httpApi.middleware.sanitize(
					validProperty,
					validSchema,
					validCbSpy
				);
				done();
			});

			it('should return a function', done => {
				expect(sanitizeResultFunction).to.be.a('function');
				done();
			});

			describe('when sanitize result is called', () => {
				var validReqMock;
				var validSanitizeError;
				var validSanitizeReport;
				var validSanitizeSanitized;
				var validValue = 'validValue';
				var validSanitizeCallback;

				before(done => {
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
					done();
				});

				beforeEach(done => {
					sanitizeResultFunction(validReqMock, validRes, validSanitizeCallback);
					done();
				});

				it('should call req.sanitize with req[property], schema and cb as arguments', done => {
					expect(
						validReqMock.sanitize.calledWith(
							validReqMock[validProperty],
							validSchema
						)
					).to.be.true;
					done();
				});

				describe('when report.isValid = false', () => {
					before(done => {
						validSanitizeReport.isValid = false;
						done();
					});

					it('should call res.json', done => {
						expect(validCbSpy.called).to.be.true;
						done();
					});
				});

				describe('when report.isValid = true', () => {
					before(done => {
						validSanitizeReport.isValid = true;
						done();
					});

					it('should call callback', done => {
						expect(validCbSpy.called).to.be.true;
						done();
					});
				});
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

		describe.skip('applyAPIAccessRules', () => {
			var validConfig;

			before(done => {
				validConfig = {
					peers: {
						enabled: true,
						access: { blacklist: [] },
					},
					api: sinonSandbox.stub(),
				};
				done();
			});

			beforeEach(done => {
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
					sinonSandbox.assert.called(checkIpInListStub);
					expect(
						checkIpInListStub.calledWith(
							validConfig.peers.access.blacklist,
							validReq.ip,
							false
						)
					).to.be.true;
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

		describe.skip('useCache', () => {
			var validCache;
			var validCachedValue;
			var validErr;

			before(done => {
				validCache = {
					isReady: sinonSandbox.stub(),
					getJsonForKey: sinonSandbox.stub(),
					setJsonForKey: sinonSandbox.stub(),
				};
				validRes = {};
				validErr = 'error';
				validCachedValue = 'cachedValue';
				done();
			});

			beforeEach(done => {
				httpApi.middleware.useCache(
					loggerMock,
					validCache,
					validReq,
					validRes,
					validNextSpy
				);
				done();
			});

			afterEach(done => {
				loggerMock.debug.reset();
				done();
			});

			describe('when cache.isReady() = false', () => {
				before(done => {
					validCache.isReady.returns(false);
					done();
				});

				it('should call next function', done => {
					expect(validNextSpy.calledOnce).to.be.true;
					done();
				});
			});

			describe('when cache.isReady() = true', () => {
				before(done => {
					validCache.isReady.returns(true);
					validCache.getJsonForKey.yields(validErr, validCachedValue);
					done();
				});

				it('should call cache.getJsonForKey with key = req.originalUrl', done => {
					expect(validCache.getJsonForKey.calledWith(validReq.originalUrl)).to
						.be.true;
					done();
				});

				describe('when err = true', () => {
					before(done => {
						validErr = true;
						done();
					});

					it('should add json function to response', done => {
						expect(validRes.json).to.be.a('function');
						done();
					});

					// Not tested, because defined function is not executed at this point
					describe.skip('when res.statusCode = 200 (OK)', () => {
						before(done => {
							validRes.statusCode = 200;
							done();
						});

						it('should call logger.debug with "cached response for key: api/url"', done => {
							expect(
								loggerMock.debug.calledWith('cached response for key: api/url')
							).to.be.true;
							done();
						});

						it('should call cache.setJsonForKey with key, response as arguments', done => {
							// expect(validCache.setJsonForKey.calledWith(validReq.url, validCachedValue));
							expect(
								validCache.setJsonForKey.calledWith(
									validReq.url,
									validCachedValue
								)
							).to.be.true;
							done();
						});
					});

					it('should call next function', done => {
						expect(validNextSpy.calledOnce).to.be.true;
						done();
					});
				});

				describe('when cachedValue  = false', () => {
					before(done => {
						validCachedValue = false;
						done();
					});

					it('should add json function to response', done => {
						expect(validRes.json).to.be.a('function');
						done();
					});

					it('should call next function', done => {
						expect(validNextSpy.calledOnce).to.be.true;
						done();
					});
				});

				describe('when cachedValue = true and err = false', () => {
					before(done => {
						validCachedValue = 'cachedValue';
						validErr = false;
						validRes = {
							json: sinonSandbox.stub(),
						};
						validRes.json.withArgs(validCachedValue);
						validCache.getJsonForKey.yields(validErr, validCachedValue);
						done();
					});

					it('should call logger.debug', done => {
						expect(loggerMock.debug.called).to.be.true;
						done();
					});

					it('should call res.json with cachedValue', done => {
						expect(validRes.json.calledWith(validCachedValue)).to.be.true;
						done();
					});
				});
			});
		});
	});

	describe('respond', () => {
		var validResponse = {};

		before(done => {
			validRes = {
				json: sinonSandbox.stub(),
			};
			done();
		});

		beforeEach(done => {
			httpApi.respond(validRes, validError, validResponse);
			done();
		});

		afterEach(done => {
			validRes.json.reset();
			done();
		});

		describe('when error is defined', () => {
			it('should call res.json with {"success": false, "error": err}', done => {
				expect(validRes.json.calledWith({ success: false, error: validError }))
					.to.be.true;
				done();
			});
		});

		describe('when error is undefined', () => {
			before(done => {
				validError = null;
				done();
			});

			it('should call res.json with extend({}, {"success": true}, response)', done => {
				validResponse.success = true;
				expect(validRes.json.calledWith(validResponse)).to.be.true;
				done();
			});
		});
	});

	describe('respondWithCode', () => {
		var validResponse;

		before(done => {
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
			done();
		});

		beforeEach(done => {
			httpApi.respondWithCode(validRes, validError, validResponse);
			done();
		});

		afterEach(done => {
			validRes.json.reset();
			done();
		});

		describe('when error is defined', () => {
			before(done => {
				validError = {
					message: 'validError',
					toJson: sinonSandbox.stub(),
				};
				done();
			});

			it('should call res.status(500).json() with error in json format', done => {
				var tmp_error = validError.code
					? validError.code
					: apiCodes.INTERNAL_SERVER_ERROR;

				expect(validRes.status.calledWith(tmp_error)).to.be.true;
				expect(validRes.json.calledOnce).to.be.true;
				done();
			});
		});

		describe('when error is undefined', () => {
			before(done => {
				validError = null;
				done();
			});

			describe('when response is empty', () => {
				it('should call res.status with code = 204 and res.json', done => {
					expect(validRes.status.calledWith(apiCodes.EMPTY_RESOURCES_OK)).to.be
						.true;
					expect(validRes.json.calledOnce).to.be.true;
					done();
				});
			});

			describe('when response is not empty', () => {
				before(done => {
					validResponse = {
						data: [1, 2, 3],
					};
					done();
				});

				it('should call res.status with code = 200 and res.json', done => {
					expect(validRes.status.calledWith(apiCodes.OK)).to.be.true;
					expect(validRes.json.calledOnce).to.be.true;
					done();
				});
			});
		});
	});

	describe('registerEndpoint', () => {
		var validRoute;
		var validApp;
		var validRouter;
		var validIsLoaded;

		before(done => {
			validRoute = null;
			validApp = {
				use: sinonSandbox.stub(),
			};
			validRouter = {
				use: sinonSandbox.stub(),
			};
			validIsLoaded = true;
			done();
		});

		beforeEach(done => {
			httpApi.registerEndpoint(
				validRoute,
				validApp,
				validRouter,
				validIsLoaded
			);
			done();
		});

		it('should call router.use with middleware.notFound', done => {
			expect(validRouter.use.calledWith(httpApi.middleware.notFound)).to.be
				.true;
			done();
		});

		it('should call router.use with middleware.blockchainReady.bind(null, validIsLoaded)', done => {
			expect(validRouter.use.args[1][0].toString()).to.equal(
				httpApi.middleware.blockchainReady.bind(null, validIsLoaded).toString()
			);
			done();
		});

		it('should call app.use with route and router as arguments', done => {
			expect(validApp.use.calledWith(validRoute, validRouter));
			done();
		});
	});
});
