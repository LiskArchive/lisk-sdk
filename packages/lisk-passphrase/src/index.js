'use strict';
var __importStar =
	(this && this.__importStar) ||
	function(mod) {
		if (mod && mod.__esModule) return mod;
		var result = {};
		if (mod != null)
			for (var k in mod)
				if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
		result['default'] = mod;
		return result;
	};
var Mnemonic = __importStar(require('bip39'));
var validation = __importStar(require('./validation'));
module.exports = {
	Mnemonic: Mnemonic,
	validation: validation,
};
//# sourceMappingURL=index.js.map
