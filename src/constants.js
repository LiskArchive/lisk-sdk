/**
 * `constants` are the objects containing information about the fee size for different tranasctions.
 *
 * @property constants
 * @static
 * @type object
 */

var fixedPoint = Math.pow(10, 8);

var sendFee = 0.1 * fixedPoint;
var signatureFee = 5 * fixedPoint;
var delegateFee = 25 * fixedPoint;
var voteFee = 1 * fixedPoint;
var multisignatureFee = 5 * fixedPoint;
var dappFee = 25 * fixedPoint;

module.exports = {
	fixedPoint: fixedPoint,
	fees: {
		send: sendFee,
		signature: signatureFee,
		delegate: delegateFee,
		vote: voteFee,
		multisignature: multisignatureFee,
		dapp: dappFee,
	},
	fee: {
		0: sendFee,
		1: signatureFee,
		2: delegateFee,
		3: voteFee,
		4: multisignatureFee,
		5: dappFee,
	}
};
