var crypto = require('crypto-browserify');
var convert = require('./convert');

//TODO: Discuss behaviour with format and hashing
function getSha256Hash (stringToSign, format) {

	if(!format) {
		stringToSign = naclInstance.encode_utf8(stringToSign);
	} else if(format === 'utf8') {
		stringToSign = naclInstance.encode_utf8(stringToSign);
	} else if(format === 'hex') {
		stringToSign = naclInstance.from_hex(stringToSign);
	}

	return naclInstance.crypto_hash_sha256(stringToSign);
	//return crypto.createHash('sha256').update(stringToSign, format).digest();
}

module.exports = {
	getSha256Hash: getSha256Hash
}