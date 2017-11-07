'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

var express = require('express');
var httpApi = require('../../../helpers/httpApi');
var Router = require('../../../helpers/router');

describe('Router', function () {

	describe('attachMiddlwareForUrls', function () {

		var expressMock;
		var httpApiMock;
		var router;
		var middleware = {'check': 'OK'};

		beforeEach(function () {
			router = {'use': function (stuff) {}};
			expressMock = sinon.mock(express);
			httpApiMock = sinon.mock(httpApi);
			expressMock.expects('Router').once().returns(router);
	  });

	  afterEach(function () {
			httpApiMock.restore();
			expressMock.restore();
			expressMock.verify();
	  });
		describe('when route has no space', function () {
			it('should throw "Invalid map config"', function () {
				expect(
					function () {Router().attachMiddlwareForUrls({}, ['fail']);}
				).to.throw(
					Error,
					/Invalid map config/
				);
			});
		});

		describe('when route verb is not get or post or put', function () {
			it('should throw "Invalid map config"', function () {
				expect(
					function () {
						Router().attachMiddlwareForUrls({}, ['nonhttpverb url']);
					}
				).to.throw(
					Error,
					/Invalid map config/
				);
			});
		});

		it('should pass with http verb of get', function () {
			router['get'] = function (url, mw) {
				expect(url).to.equal('get/url');
				expect(mw).to.eql(middleware);
			};
			Router().attachMiddlwareForUrls(middleware, ['get get/url']);
		});

		it('should pass with http verb of put', function () {
			router['put'] = function (url, mw) {
				expect(url).to.equal('put/url');
				expect(mw).to.eql(middleware);
			};
			Router().attachMiddlwareForUrls(middleware, ['put put/url']);
		});

		it('should pass with http verb of post', function () {
			router['post'] = function (url, mw) {
				expect(url).to.equal('post/url');
				expect(mw).to.eql(middleware);
			};
			Router().attachMiddlwareForUrls(middleware, ['post post/url']);
		});
	});

	describe('map', function () {

		var expressMock;
		var httpApiMock;
		var router;

		beforeEach(function () {
			router = {'use': function (stuff) {}};
			expressMock = sinon.mock(express);
			httpApiMock = sinon.mock(httpApi);
			expressMock.expects('Router').once().returns(router);
	  });

	  afterEach(function () {
			httpApiMock.restore();
			expressMock.restore();
			expressMock.verify();
	  });

		describe('when route has no space', function () {
			it('should throw "Invalid map config"', function () {
				expect(
					function () {
						Router().map({}, [{'fail': 'value'}]);
					}
				).to.throw(
					Error,
					/Invalid map config/
				);
			});
		});

		describe('when route verb is not get or post or put', function () {
			it('should throw "Invalid map config"', function () {
				expect(
					function () {
						Router().map({}, [{'nonhttpverb url': 'value'}]);
					}
				).to.throw(
					Error,
					/Invalid map config/
				);
			});
		});

		it('should pass with http verb of get', function () {

			var req = {
				'ip': '127.0.0.1',
				'method': 'get',
				'path': 'get/url',
				'query': 'get=apples'
			};

			var root = {
				'getRootLevelIdentifier': function (result) {
					expect(result.ip).to.equal(req.ip);
					expect(result.method).to.equal(req.method);
					expect(result.path).to.equal(req.path);
					expect(result.body).to.equal(req.query);
				}
			};

			router['get'] = function (url, cb) {
				expect(url).to.equal('get/url');
				cb(req, {}, null);
			};

			Router().map(root, {'get get/url':'getRootLevelIdentifier'});
		});

		it('should pass with http verb of put', function () {

			var req = {
				'ip': '127.0.0.2',
				'method': 'put',
				'path': 'put/url',
				'body': 'put apples'
			};

			var root = {
				'putRootLevelIdentifier': function (result) {
					expect(result.ip).to.equal(req.ip);
					expect(result.method).to.equal(req.method);
					expect(result.path).to.equal(req.path);
					expect(result.body).to.equal(req.body);
				}
			};

			router['put'] = function (url, cb) {
				expect(url).to.equal('put/url');
				cb(req, {}, null);
			};

			Router().map(root, {'put put/url':'putRootLevelIdentifier'});
		});

		it('should pass with http verb of post', function () {

			var req = {
				'ip': '127.0.0.3',
				'method': 'post',
				'path': 'post/url',
				'body': 'post apples'
			};

			var root = {
				'postRootLevelIdentifier': function (result) {
					expect(result.ip).to.equal(req.ip);
					expect(result.method).to.equal(req.method);
					expect(result.path).to.equal(req.path);
					expect(result.body).to.equal(req.body);
				}
			};

			router['post'] = function (url, cb) {
				expect(url).to.equal('post/url');
				cb(req, {}, null);
			};

			Router().map(root, {'post post/url':'postRootLevelIdentifier'});
		});
	});
});
