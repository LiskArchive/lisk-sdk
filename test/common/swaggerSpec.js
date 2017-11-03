var node = require('../node');
var apiSpec = node.swaggerDef;
var _ = require('lodash');
var refsResolved = false;
var swaggerHelper = require('../../helpers/swagger');
var validator = swaggerHelper.getValidator();

// Make sure no additional attributes are passed in response
validator.options.assumeAdditional = true;

// Extend Chai assertion with a new method validResponse
// to facilitate the validation of swagger response body
// e.g. res.body.should.be.validResponse
node.chai.use(function (_chai, utils) {
	_chai.Assertion.addMethod('validResponse', function (responsePath) {
		var result = validator.validate(utils.flag(this,'object'), apiSpec, {schemaPath: responsePath});
		var errorDetail = '';

		if (!result) {
			utils.flag(this, 'message', 'InvalidResponseBody');

			errorDetail = _.map(validator.getLastErrors(), function (object) {
				return object.code + ': ' + object.path.join('.') + ' | ' + object.message;
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
 *
 * @param {String} method - HTTP method e.g. GET, PUT, POST
 * @param {String} [apiPath] - API endpoint excluding the base path
 * @param {Integer} [responseCode] - Expected status code from endpoint
 * @constructor
 */
function SwaggerTestSpec (method, apiPath, responseCode) {
	if(apiPath && method && responseCode) {
		this.path = apiPath;
		this.method = method.toLowerCase();
		this.responseCode = responseCode;
	} else if (method) {
		// Considering that object was created with single param format
		// 'GET /node/status 200'
		var specParam = method.split(' ');

		this.path = _.trim(specParam[1]);
		this.method = _.trim(specParam[0]).toLowerCase();
		this.responseCode = parseInt(specParam[2]);
	} else {
		throw 'SwaggerTestSpec was created with invalid params';
	}

	this.spec = apiSpec.paths[this.path][this.method];
	this.responseSpecPath = ['paths', this.path, this.method, 'responses', this.responseCode, 'schema'].join('.');
	this.responseSpec = this.spec.responses[this.responseCode];

	this.describe = this.method.toUpperCase() + ' ' + apiSpec.basePath + this.path;
	this.it = 'should respond with status code ' + this.responseCode;

	var self = this;

	this.resolveJSONRefs = function () {
		if (refsResolved) {
			return node.Promise.resolve();
		}

		return swaggerHelper.getResolvedSwaggerSpec().then(function (results) {
			apiSpec = results;
			refsResolved = true;

			self.spec = apiSpec.paths[self.path][self.method];
			self.responseSpec = self.spec.responses[self.responseCode];
		});
	};
}

/**
 * Perform the actual HTTP call with the spec of current instance
 *
 * @param {Object} [parameters] - JSON object of all parameters, including query, post
 * @return {*|Promise<any>}
 */
SwaggerTestSpec.prototype.makeRequest = function (parameters){
	var query = {};
	var post = {};
	var headers = {'Accept': 'application/json'};
	var formData = false;
	var self = this;
	var callPath = self.path;

	return this.resolveJSONRefs().then(function () {

		_.each(_.keys(parameters), function (param){
			var p = _.find(self.spec.parameters, {name: param});
			if(p.in === 'query') {
				query[param] = parameters[param];
			} else if (p.in === 'body') {
				post[param] = parameters[param];
			} else if (p.in === 'path') {
				callPath = callPath.replace('{' + param + '}', parameters[param]);
			} else if (p.in === 'formData') {
				post[param] = parameters[param];
				formData = true;
			} else if (p.in === 'header') {
				headers[param] = parameters[param];
			}
		});

		var req = node.supertest(node.baseUrl);

		if (self.method === 'post') {
			req = req.post(apiSpec.basePath + callPath);
		} else if (self.method === 'put') {
			req = req.put(apiSpec.basePath + callPath);
		} else if (self.method === 'get') {
			req = req.get(apiSpec.basePath + callPath);
		}

		_.each(_.keys(headers), function (header){
			req.set(header, headers[header]);
		});

		req = req.query(query);

		if (self.method === 'post' || self.method === 'put') {
			if (formData) {
				req.type('form');
			}
			req = req.send(post);
		}

		node.debug(['> URI:'.grey, req.method, req.url].join(' '));

		if(!_.isEmpty(query)) {
			node.debug(['> Query:'.grey, JSON.stringify(query)].join(' '));
		}
		if(!_.isEmpty(post)) {
			node.debug(['> Data:'.grey, JSON.stringify(post)].join(' '));
		}
		return req;
	}).then(function (res) {

		node.debug('> Response:'.grey, JSON.stringify(res.body));

		describe(self.describe, function () {
			it('should response with status code ' + self.responseCode, function () {
				res.statusCode.should.be.eql(self.responseCode);
			});

			it('should response json content type ', function () {
				res.headers['content-type'].should.match(/json/);
			});

			it('should match the response schema defined in swagger spec', function () {
				res.body.should.be.validResponse(self.responseSpecPath);
				//validator.validate(res.body, apiSpec, {schemaPath: self.responseSpecPath}).should.be.true;
			});
		});

		return res;
	})
		.catch(function (eror){
			console.log(validator.getLastErrors());
			throw eror;
		});
};


/**
 * A helper method to create an object swagger test spec
 * Can be called with three parameters or only with one in a string form
 * > ('GET', '/node/status', 200)
 * > ('GET /node/status 200')
 * @param {String} method - HTTP method e.g. GET, PUT, POST
 * @param {String} [path] - API endpoint excluding the base path
 * @param {Integer} [responseCode] - Expected status code from endpoint
 * @return {SwaggerTestSpec}
 */
module.exports = function (method, path, responseCode) {
	return new SwaggerTestSpec(method, method, responseCode);
};
