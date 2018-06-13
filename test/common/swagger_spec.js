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

var chai = require('chai');
var supertest = require('supertest');
var Promise = require('bluebird');
var swaggerHelper = require('../../helpers/swagger');

var apiSpec = swaggerHelper.getSwaggerSpec();
var refsResolved = false;
var validator = swaggerHelper.getValidator();

// Make sure no additional attributes are passed in response
validator.options.assumeAdditional = true;

// Extend Chai assertion with a new method validResponse
// to facilitate the validation of swagger response body
// e.g. expect(res.body).to.be.validResponse
chai.use((chai, utils) => {
	chai.Assertion.addMethod('validResponse', function(responsePath) {
		var result = validator.validate(utils.flag(this, 'object'), apiSpec, {
			schemaPath: responsePath,
		});
		var errorDetail = '';

		if (!result) {
			utils.flag(this, 'message', 'InvalidResponseBody');

			errorDetail = _.map(validator.getLastErrors(), object => {
				return `${object.code}: ${object.path.join('.')} | ${object.message}`;
			}).join('\n');
		}

		this.assert(result, errorDetail);
	});
});

/**
 * A class to make test spec for swagger based endpoint
 * Can be called with three parameters or only with one in a string form
 * > new SwaggerTestSpec('GET', '/node/status', 200)
 * > new SwaggerTestSpec('GET /node/status 200')
 * > new SwaggerTestSpec('GET /node/status')
 *
 * @param {string} method - HTTP method e.g. GET, PUT, POST
 * @param {string} [apiPath] - API endpoint excluding the base path
 * @param {number} [responseCode] - Expected status code from endpoint
 * @constructor
 */
function SwaggerTestSpec(method, apiPath, responseCode) {
	if (apiPath && method && responseCode) {
		this.path = apiPath;
		this.method = method.toLowerCase();
		this.responseCode = responseCode;
	} else if (method) {
		// Considering that object was created with single param format
		// 'GET /node/status 200'
		var specParam = method.split(' ');

		this.path = _.trim(specParam[1]);
		this.method = _.trim(specParam[0]).toLowerCase();

		if (specParam.length === 3) {
			this.responseCode = parseInt(specParam[2]);
		}
	} else {
		throw 'SwaggerTestSpec was created with invalid params';
	}

	var self = this;

	this.getResponseSpec = function(statusCode) {
		return self.spec.responses[statusCode];
	};

	this.getResponseSpecPath = function(statusCode) {
		return [
			'paths',
			self.path,
			self.method,
			'responses',
			statusCode,
			'schema',
		].join('.');
	};

	this.resolveJSONRefs = function() {
		if (refsResolved) {
			return Promise.resolve();
		}

		return swaggerHelper.getResolvedSwaggerSpec().then(results => {
			apiSpec = results;
			refsResolved = true;

			self.spec = apiSpec.paths[self.path][self.method];
			self.responseSpec = self.spec.responses[self.responseCode];
		});
	};

	this.spec = apiSpec.paths[this.path][this.method];
	this.responseSpecPath = this.getResponseSpecPath(this.responseCode, 'schema');
	this.responseSpec = this.getResponseSpec(this.responseCode);

	this.describe = `${this.method.toUpperCase()} ${apiSpec.basePath}${
		this.path
	}`;
	this.it = `should respond with status code ${this.responseCode}`;
	this.defaultParams = {};

	return this;
}

/**
 * Parameters to set default on each request
 *
 * @param {Object} parameters - JSON parameters
 */
SwaggerTestSpec.prototype.addParameters = function(parameters) {
	_.assignIn(this.defaultParams, parameters);
	return this;
};

/**
 * Perform the actual HTTP call with the spec of current instance
 *
 * @param {Object} [parameters] - JSON object of all parameters, including query, post
 * @param {int} [responseCode] - Expected Response code. Will override what was used in constructor
 * @return {*|Promise<any>}
 */
SwaggerTestSpec.prototype.makeRequest = function(parameters, responseCode) {
	var query = {};
	var post = {};
	var headers = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
	};
	var formData = false;
	var self = this;
	var callPath = self.getPath();
	parameters = _.assignIn({}, self.defaultParams, parameters);

	return this.resolveJSONRefs()
		.then(() => {
			_.each(_.keys(parameters), param => {
				var p = _.find(self.spec.parameters, { name: param });

				// If a swagger defined parameter
				if (p) {
					if (p.in === 'query') {
						query[param] = parameters[param];
					} else if (p.in === 'body') {
						post = parameters[param];
					} else if (p.in === 'path') {
						callPath = callPath.replace(`{${param}}`, parameters[param]);
					} else if (p.in === 'formData') {
						post = parameters[param];
						formData = true;
					} else if (p.in === 'header') {
						headers[param] = parameters[param];
					}
				} else {
					// If not a swagger defined parameter consider as query param
					query[param] = parameters[param];
				}
			});

			var req = supertest(__testContext.baseUrl);

			if (self.method === 'post') {
				req = req.post(callPath);
			} else if (self.method === 'put') {
				req = req.put(callPath);
			} else if (self.method === 'patch') {
				req = req.patch(callPath);
			} else if (self.method === 'get') {
				req = req.get(callPath);
			}

			_.each(_.keys(headers), header => {
				req.set(header, headers[header]);
			});

			req = req.query(query);

			if (
				self.method === 'post' ||
				self.method === 'put' ||
				self.method === 'patch'
			) {
				if (formData) {
					req.type('form');
				}
				req = req.send(post);
			}

			__testContext.debug(['> URI:'.grey, req.method, req.url].join(' '));

			if (!_.isEmpty(query)) {
				__testContext.debug(['> Query:'.grey, JSON.stringify(query)].join(' '));
			}
			if (!_.isEmpty(post)) {
				__testContext.debug(['> Data:'.grey, JSON.stringify(post)].join(' '));
			}
			return req;
		})
		.then(res => {
			__testContext.debug(
				'> Response:'.grey,
				res.statusCode,
				JSON.stringify(res.body)
			);

			var expectedResponseCode = responseCode || self.responseCode;

			expect(res.statusCode).to.be.eql(expectedResponseCode);
			expect(res.headers['content-type']).to.match(/json/);
			expect(res.body).to.be.validResponse(
				self.getResponseSpecPath(expectedResponseCode)
			);

			return res;
		})
		.catch(eror => {
			__testContext.debug(
				'> Response Error:'.grey,
				JSON.stringify(validator.getLastErrors())
			);
			throw eror;
		});
};

/**
 * Perform the actual HTTP request on individual parameter set.
 *
 * @param {Object} [parameters] - Array of JSON objects for individual request passed to +makeRequest+
 * @param {int} [responseCode] - Expected response code. Will override what was used in constructor
 * @return {*|Promise<any>}
 */
SwaggerTestSpec.prototype.makeRequests = function(parameters, responseCode) {
	var self = this;
	var requests = [];
	parameters.forEach(paramSet => {
		requests.push(self.makeRequest(paramSet, responseCode));
	});
	return Promise.all(requests);
};

/**
 * Get full path of an endpoint.
 *
 * @return {string}
 */
SwaggerTestSpec.prototype.getPath = function() {
	return apiSpec.basePath + this.path;
};

/**
 * A helper method to create an object swagger test spec
 * Can be called with three parameters or only with one in a string form
 * > ('GET', '/node/status', 200)
 * > ('GET /node/status 200')
 * > ('GET /node/status')
 *
 * @param {string} method - HTTP method e.g. GET, PUT, POST
 * @param {string} [path] - API endpoint excluding the base path
 * @param {number} [responseCode] - Expected status code from endpoint
 * @return {SwaggerTestSpec}
 */
module.exports = function(method, path, responseCode) {
	return new SwaggerTestSpec(method, path, responseCode);
};
