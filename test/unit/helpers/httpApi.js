var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var _ = require('underscore');

var httpApi = require('../../../helpers/httpApi');

describe('httpApi', function () {
	describe('middleware', function () {
		describe('cors', function () {
			it('headers are set correctly', function () {
				var headers = {};
				var called = false;
				var res = {
					header: function (key, value) {
						headers[key] = value;
					}
				};
				httpApi.middleware.cors(null, res, function () {called = true;});
				expect(headers).to.eql({'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers': 'Origin, X-Objected-With, Content-Type, Accept'});
				expect(called).to.be.true;
			});
		});

		describe('errorLogger', function () {
			before(function () {
				sinon.stub(console,'trace', function (err) {
					console.log('trace called.');
				});
			});
			after(function () {
				console.trace.restore();
			});

			it('error = null', function () {
				var nextCalled = false;
				httpApi.middleware.errorLogger(null, null, null, null, function () {nextCalled = true;});
				expect(nextCalled).to.be.true;
			});

			it('error != null', function () {
				var nextCalled = false;
				var errorCalled = false;
				var sendCalled = false;
				var logger = {
					error: function (message, err) {
						expect(message).to.equal('API error api/url');
						errorCalled = true;
					}
				};
				var res = {
					status: function (httpCode) {
						expect(httpCode).to.equal(500);
						return {
							send: function (val) {
								expect(val.success).to.be.false;
								expect(val.error).to.equal('API error: forcedError');
								sendCalled = true;
							}
						};
					}
				};

				httpApi.middleware.errorLogger(logger, {message: 'forcedError'}, {url: 'api/url'}, res, function () {nextCalled = true;});
				expect(nextCalled).to.be.false;
				expect(errorCalled).to.be.true;
				expect(sendCalled).to.be.true;
			});
		});

		describe('logClientConnections', function () {
			it('logs the message on the logger', function () {
				var loggerCalled = false;
				var nextCalled = false;
				var logger = {
					log: function (message) {
						expect(message).to.equal('GET req/url from 127.0.0.1');
						loggerCalled = true;
					}
				};
				var req = {method: 'GET', url: 'req/url', ip: '127.0.0.1'};
				httpApi.middleware.logClientConnections(logger, req, null, function () {nextCalled = true;});
				expect(loggerCalled).to.be.true;
				expect(nextCalled).to.be.true;
			});
		});

		describe('blockchainReady', function () {
			it('is ready', function () {
				var nextCalled = false;
				httpApi.middleware.blockchainReady(function () {return true;}, null, null, function () {nextCalled = true;});
				expect(nextCalled).to.be.true;
			});
			it('is not ready', function () {
				var nextCalled = false;
				var sendCalled = false;
				var res = {
					status: function (httpCode) {
						expect(httpCode).to.equal(500);
						return {
							send: function (val) {
								expect(val.success).to.be.false;
								expect(val.error).to.equal('Blockchain is loading');
								sendCalled = true;
							}
						};
					}
				};
				httpApi.middleware.blockchainReady(function () {return false;}, null, res, function () {nextCalled = true;});
				expect(nextCalled).to.be.false;
				expect(sendCalled).to.be.true;
			});
		});

		describe('notFound', function () {
			it('calls the not found method', function () {
				var sendCalled = false;
				var res = {
					status: function (httpCode) {
						expect(httpCode).to.equal(500);
						return {
							send: function (val) {
								expect(val.success).to.be.false;
								expect(val.error).to.equal('API endpoint not found');
								sendCalled = true;
							}
						};
					}
				};
				httpApi.middleware.notFound(null, res, null);
				expect(sendCalled).to.be.true;
			});
		});

		describe('sanitize', function () {
			it('report is not valid', function (){
				var calledSanitize = false;
				var rfunction = httpApi.middleware.sanitize('prop', null, null);
				var req = {
					prop: 'prop',
					sanitize: function (propname, schema, fn) {
						expect(propname).to.equal('prop');
						var report = {
							isValid: false,
							issues: 'a mock error'
						};
						expect(fn(null, report, false)).to.be.true;
						calledSanitize = true;
					}
				};
				var res = {
					json: function (json) {
						expect(json).to.eql({success: false, error: 'a mock error'});
						return true;
					}
				};
				rfunction(req, res, null);
				expect(calledSanitize).to.be.true;
			});
		});

		describe('attachResponseHeader', function () {
			it('adds one header', function () {
				var setHeaderCalled = false;
				var cbCalled = false;
				var res = {
					setHeader: function (key, value) {
						expect(key).to.equal('key');
						expect(value).to.equal('value');
						setHeaderCalled = true;
					}
				};
				httpApi.middleware.attachResponseHeader('key', 'value', {}, res, function () {cbCalled = true;});
				expect(setHeaderCalled).to.be.true;
				expect(cbCalled).to.be.true;
			});
			it('adds all the headers', function () {
				var headers = {header1: 'header1', header2: 'header2'};
				var getHeaders = function () { return headers;};
				var setHeaderCalled = false;
				var nextCalled = false;
				var res = {
					set: function (values) {
						expect(values).to.eql(headers);
						setHeaderCalled = true;
					}
				};
				httpApi.middleware.attachResponseHeaders(getHeaders, null, res, function () {nextCalled = true;});
				expect(setHeaderCalled).to.be.true;
				expect(nextCalled).to.be.true;
			});
		});

		describe('useCache', function () {
			it('is not ready', function () {
				var nextCalled = false;
				var next = function () {
					nextCalled = true;
				};
				httpApi.middleware.useCache(null, {isReady: function () {return false;}}, null, null, next);
				expect(nextCalled).to.be.true;
			});
			describe('is ready', function () {
				it('cached value', function () {
					var debugCalled = false;
					var nextCalled = false;
					var cachedValue = 'cachedValue';
					var req = {
						originalUrl: 'org/url',
						url: 'new/url'
					};
					var res = {
						json: function (val) {
							expect(val).to.equal(cachedValue);
						}
					};
					var logger = {
						debug: function (str) {
							expect(str).to.equal('serving response for url: ' + req.url + ' from cache');
							debugCalled = true;
						}
					};
					var next = function () {
						nextCalled = true;
					};
					var cache = {
						isReady: function () {return true;},
						getJsonForKey: function (key, cb) {
							cb(null, cachedValue);
						}
					};
					httpApi.middleware.useCache(logger, cache, req, res, next);
					expect(nextCalled).to.be.false;
					expect(debugCalled).to.be.true;
				});
				it('cached value', function () {
					var debugCalled = false;
					var nextCalled = false;
					var resJsonCalled = false;
					var cachedValue = 'cachedValue';
					var response = {success: true};
					var req = {
						originalUrl: 'org/url',
						url: 'new/url'
					};
					var res = {
						json: function (res,thisresponse) {
							resJsonCalled = true;
						}
					};
					var logger = {
						debug: function (str, url) {
							expect(str).to.equal('cached response for key: ');
							expect(url).to.equal(req.url);
							debugCalled = true;
						}
					};
					var next = function () {
						nextCalled = true;
					};
					var cache = {
						isReady: function () {return true;},
						getJsonForKey: function (key, cb) {
							cb(null, null);
						},
						setJsonForKey: function (key, thisresponse) {
							expect(key).to.equal(req.originalUrl);
							expect(thisresponse).to.eql(response);
						}
					};
					httpApi.middleware.useCache(logger, cache, req, res, next);
					res.json({success: true});
					expect(nextCalled).to.be.true;
					//expect(debugCalled).to.be.true;
					//expect(resJsonCalled).to.be.true;
				});



			});
		});
	});

	describe('registerEndpoint', function () {
		it('registers the endpoint', function () {
			var called = 0;
			var appUseCalled = false;
			var router = {
				use: function (afunction) {
					expect(_.isFunction(afunction)).to.be.true;
					called += 1;
				},
				mine: true
			};
			var app = {
				use: function (aroute, arouter) {
					expect(aroute).to.equal('route');
					expect(arouter.mine).to.be.true;
					appUseCalled = true;
				}
			};
			httpApi.registerEndpoint('route', app, router, false);
			expect(called).to.equal(2);
			expect(appUseCalled).to.be.true;
		});
	});

	describe('respond', function () {
		it('error', function () {
			var error = 'an error occured';
			var resJsonCalled = false;
			var res = {
				json: function (json) {
					expect(json.success).to.be.false;
					expect(json.error).to.equal(error);
					resJsonCalled = true;
				}
			};
			httpApi.respond(res, error, null);
			expect(resJsonCalled).to.be.true;
		});
		it('success', function () {
			var success = {message: 'successful'};
			var resJsonCalled = false;
			var res = {
				json: function (json) {
					expect(json.success).to.be.true;
					expect(json.message).to.equal(success.message);
					resJsonCalled = true;
				}
			};
			httpApi.respond(res, null, success);
			expect(resJsonCalled).to.be.true;
		});
	});
});
