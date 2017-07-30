var node = require('../../node.js');
var Z_schema = require('../../../helpers/z_schema.js');

var validator = new Z_schema();
var expect = node.expect;

describe('schema - custom formats', function () {
	describe('hex', function () {
		var schema = {
			format: 'hex'
		};

		it('should return false for invalid hex value', function () {
			var invalidHex = 'ec0c50z';
			expect(validator.validate(invalidHex, schema)).to.equal(false);
		});

		it('should return true for empty string', function () {
			var emptyString = '';
			expect(validator.validate(emptyString, schema)).to.equal(true);
		});

		it('should return true for valid hex value', function () {
			var validHex = 'ec0c50e';
			expect(validator.validate(validHex, schema)).to.equal(true);
		});
	});

	describe('publicKey', function () {
		var schema = {
			format: 'publicKey'
		};

		it('should return false if value is not in hex format', function () {
			var invalidPublicKey = 'zxcdec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			expect(validator.validate(invalidPublicKey, schema)).to.equal(false);
		});

		it('should return false for value < 64', function () {
			var invalidLengthPublicKey = 'c3595ff6041c3bd28b76b8cf75dce8225173d1241624ee89b50f2a8';
			expect(validator.validate(invalidLengthPublicKey, schema)).to.equal(false);
		});

		it('should return false for value > 64', function () {
			var invalidLengthPublicKey = 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8123';
			expect(validator.validate(invalidLengthPublicKey, schema)).to.equal(false);
		});

		it('should return true for empty string', function () {
			var emptyString = '';
			expect(validator.validate(emptyString, schema)).to.equal(true);
		});

		it('should return true for valid publicKey', function () {
			var validPublicKey = 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			expect(validator.validate(validPublicKey, schema)).to.equal(true);
		});
	});

	describe('signature', function () {
		var schema = {
			format: 'signature'
		};

		it('should return false if value is not in hex format', function () {
			var invalidPublicKey = 'zxcdec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';
			expect(validator.validate(invalidPublicKey, schema)).to.equal(false);
		});

		it('should return false if value < 128', function () {
			var invalidLengthSignature = '3d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			expect(validator.validate(invalidLengthSignature, schema)).to.equal(false);
		});

		it('should return false if value > 128', function () {
			var invalidLengthSignature = '1231d8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			expect(validator.validate(invalidLengthSignature, schema)).to.equal(false);
		});

		it('should return true for empty string', function () {
			var emptyString = '';
			expect(validator.validate(emptyString, schema)).to.equal(true);
		});

		it('should return true for valid publicKey', function () {
			var validSignature = 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05';
			expect(validator.validate(validSignature, schema)).to.equal(true);
		});
	});
});
