/**
 * `constants` are the objects containing information about the fee size for different tranasctions.
 *
 * @property constants
 * @static
 * @type object
 */

const fixedPoint = Math.pow(10, 8);

const sendFee = 0.1 * fixedPoint;
const signatureFee = 5 * fixedPoint;
const delegateFee = 25 * fixedPoint;
const voteFee = 1 * fixedPoint;
const multisignatureFee = 5 * fixedPoint;
const dappFee = 25 * fixedPoint;

module.exports = {
	fixedPoint,
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
	},
};
