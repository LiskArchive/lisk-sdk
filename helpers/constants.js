module.exports = {
	maxAmount: 100000000,
	maxPayloadLength: 1024 * 1024,
	blockHeaderLength: 248,
	addressLength: 208,
	maxAddressesLength: 208 * 128,
	maxClientConnections: 100,
	numberLength: 100000000,
	feeStartVolume: 10000 * 100000000,
	feeStart: 1,
	fees:{
		send:10000000,
		vote:100000000,
		secondsignature:500000000,
		delegate:10000000000,
		multisignature:500000000,
		dapp:50000000000
	},
	activeDelegates: 101,
	maxRequests: 10000 * 12,
	requestLength: 104,
	signatureLength: 196,
	maxSignaturesLength: 196 * 256,
	maxConfirmations : 77 * 100,
	confirmationLength: 77,
	fixedPoint : Math.pow(10, 8),
	totalAmount: 10000000000000000,
	rewardOffset: 2021,
	distance: 3000000, // Distance between each milestone
	maxTxsPerBlock: 25
}
