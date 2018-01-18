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

var randomstring = require('randomstring');

var Z_schema = require('../../../helpers/z_schema.js');
var constants = require('../../../helpers/constants.js');

var validator = new Z_schema();

describe('schema - custom formats', function () {

	describe('additionalData', function () {
		var schema = {
			format: 'additionalData'
		};

		it('should return false if string is longer than maxLength (either chars or bytes)', function () {
			var invalidData = [];
			invalidData.push(randomstring.generate(constants.additionalData.maxLength - 1) + '现');
			invalidData.push(randomstring.generate(constants.additionalData.maxLength + 1));

			invalidData.forEach(function (item) {
				validator.validate(item, schema).should.equal(false);
			});
		});

		it('should return true if string is between minLength and maxLength', function () {
			var validData = [];
			validData.push(randomstring.generate(constants.additionalData.minLength));
			validData.push(randomstring.generate(constants.additionalData.maxLength));

			validData.forEach(function (item) {
				validator.validate(item, schema).should.equal(true);
			});
		});
	});

	describe('hex', function () {
		var schema = {
			format: 'hex'
		};

		it('should return false for invalid hex value', function () {
			var invalidHex = 'ec0c50z';
			validator.validate(invalidHex, schema).should.equal(false);
		});

		it('should return true for empty string', function () {
			var emptyString = '';
			validator.validate(emptyString, schema).should.equal(true);
		});

		it('should return true for valid hex value', function () {
			var validHex = 'ec0c50e';
			validator.validate(validHex, schema).should.equal(true);
		});
	});

	describe('publicKey', function () {
		var schema = {
			format: 'publicKey'
		};

		it('should return false if value is not in hex format', function () {
			var invalidPublicKey = 'zxcdec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			validator.validate(invalidPublicKey, schema).should.equal(false);
		});

		it('should return false for value < 64', function () {
			var invalidLengthPublicKey = 'c3595ff6041c3bd28b76b8cf75dce8225173d1241624ee89b50f2a8';
			validator.validate(invalidLengthPublicKey, schema).should.equal(false);
		});

		it('should return false for value > 64', function () {
			var invalidLengthPublicKey = 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8123';
			validator.validate(invalidLengthPublicKey, schema).should.equal(false);
		});

		it('should return true for empty string', function () {
			var emptyString = '';
			validator.validate(emptyString, schema).should.equal(true);
		});

		it('should return true for valid publicKey', function () {
			var validPublicKey = 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			validator.validate(validPublicKey, schema).should.equal(true);
		});
	});

	describe('signature', function () {
		var schema = {
			format: 'signature'
		};

		it('should return false if value is not in hex format', function () {
			var invalidPublicKey = 'zxcdec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			validator.validate(invalidPublicKey, schema).should.equal(false);
		});

		it('should return false if value < 128', function () {
			var invalidLengthSignature = '3d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			validator.validate(invalidLengthSignature, schema).should.equal(false);
		});

		it('should return false if value > 128', function () {
			var invalidLengthSignature = '1231d8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			validator.validate(invalidLengthSignature, schema).should.equal(false);
		});

		it('should return true for empty string', function () {
			var emptyString = '';
			validator.validate(emptyString, schema).should.equal(true);
		});

		it('should return true for valid publicKey', function () {
			var validSignature = 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			validator.validate(validSignature, schema).should.equal(true);
		});
	});

	describe('ipOrFQDN', function () {
		var schema = {
			format: 'ipOrFQDN'
		};

		it('should return false if value is not an IP or not a FQDN', function () {
			var invalidData = ['192.168', 'alpha-', 'apha_server', 'alpha.server.'];

			invalidData.forEach(function (item) {
				validator.validate(item, schema).should.equal(false);
			});
		});

		it('should return true if value is an IP or a valid FQDN', function () {
			var validData = ['192.168.0.1', '127.0.0.1', 'localhost', 'app.server', 'alpha.server.com', '8.8.8.8'];

			validData.forEach(function (item) {
				validator.validate(item, schema).should.equal(true);
			});
		});
	});
});
