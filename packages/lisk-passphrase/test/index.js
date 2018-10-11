'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function(mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
exports.__esModule = true;
var src_1 = __importDefault(require('../src'));
var chai_1 = require('chai');
describe('passphrase index.js', function() {
	it('should export an object', function() {
		return chai_1.expect(src_1['default']).to.be.an('object');
	});
	describe('menmonic module', function() {
		it('should have the BIP39 Mnemonic module', function() {
			return chai_1.expect(src_1['default'].Mnemonic).to.be.ok;
		});
	});
	describe('validation module', function() {
		it('should have the validation module', function() {
			return chai_1.expect(src_1['default'].validation).to.be.ok;
		});
	});
});
//# sourceMappingURL=index.js.map
