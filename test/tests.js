var Buffer = require("buffer/").Buffer;
var crypto_lib = require("crypto-browserify");
var should = require("should");
var lisk = require("../index.js");

describe("Lisk JS", function () {

	it("should be ok", function () {
		(lisk).should.be.ok;
	});

	it("should be object", function () {
		(lisk).should.be.type("object");
	});

	it("should have properties", function () {
		var properties = ["transaction", "signature", "vote", "delegate", "dapp", "crypto"];

		properties.forEach(function (property) {
			(lisk).should.have.property(property);
		});
	});

	describe("crypto.js", function () {
		var crypto = lisk.crypto;

		it("should be ok", function () {
			(crypto).should.be.ok;
		});

		it("should be object", function () {
			(crypto).should.be.type("object");
		});

		it("should has properties", function () {
			var properties = ["getBytes", "getHash", "getId", "getFee", "sign", "secondSign", "getKeys", "getAddress", "verify", "verifySecondSignature", "fixedPoint"];
			properties.forEach(function (property) {
				(crypto).should.have.property(property);
			});
		});

		describe("#getBytes", function () {
			var getBytes = crypto.getBytes;
			var bytes = null;

			it("should be ok", function () {
				(getBytes).should.be.ok;
			});

			it("should be a function", function () {
				(getBytes).should.be.type("function");
			});

			it("should return Buffer of simply transaction and buffer most be 117 length", function () {
				var transaction = {
					type: 0,
					amount: 1000,
					recipientId: "58191285901858109L",
					timestamp: 141738,
					asset: {},
					senderPublicKey: "5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09",
					signature: "618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a",
					id: "13987348420913138422"
				};

				bytes = getBytes(transaction);
				(bytes).should.be.ok;
				(bytes).should.be.type("object");
				(bytes.length).should.be.equal(117);
			});

			it("should return Buffer of transaction with second signature and buffer most be 181 length", function () {
				var transaction = {
					type: 0,
					amount: 1000,
					recipientId: "58191285901858109L",
					timestamp: 141738,
					asset: {},
					senderPublicKey: "5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09",
					signature: "618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a",
					signSignature: "618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a",
					id: "13987348420913138422"
				};

				bytes = getBytes(transaction);
				(bytes).should.be.ok;
				(bytes).should.be.type("object");
				(bytes.length).should.be.equal(181);
			});
		});

		describe("#getHash", function () {
			var getHash = crypto.getHash;

			it("should be ok", function () {
				(getHash).should.be.ok;
			});

			it("should be a function", function () {
				(getHash).should.be.type("function");
			})

			it("should return Buffer and Buffer most be 32 bytes length", function () {
				var transaction = {
					type: 0,
					amount: 1000,
					recipientId: "58191285901858109L",
					timestamp: 141738,
					asset: {},
					senderPublicKey: "5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09",
					signature: "618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a",
					id: "13987348420913138422"
				};

				var result = getHash(transaction);
				(result).should.be.ok;
				(result).should.be.type("object");
				(result.length).should.be.equal(32);
			});
		});

		describe("#getId", function () {
			var getId = crypto.getId;

			it("should be ok", function () {
				(getId).should.be.ok;
			});

			it("should be a function", function () {
				(getId).should.be.type("function");
			});

			it("should return string id and be equal to 13987348420913138422", function () {
				var transaction = {
					type: 0,
					amount: 1000,
					recipientId: "58191285901858109L",
					timestamp: 141738,
					asset: {},
					senderPublicKey: "5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09",
					signature: "618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a"
				};

				var id = getId(transaction);
				(id).should.be.type("string").and.equal("13987348420913138422");
			});
		});

		describe("#getFee", function () {
			var getFee = crypto.getFee;

			it("should be ok", function () {
				(getFee).should.be.ok;
			})

			it("should be a function", function () {
				(getFee).should.be.type("function");
			});

			it("should return number", function () {
				var fee = getFee({amount: 100000, type: 0});
				(fee).should.be.type("number");
				(fee).should.be.not.NaN;
			});

			it("should return 10000000", function () {
				var fee = getFee({amount: 100000, type: 0});
				(fee).should.be.type("number").and.equal(10000000);
			});

			it("should return 10000000000", function () {
				var fee = getFee({type: 1});
				(fee).should.be.type("number").and.equal(10000000000);
			});

			it("should be equal 1000000000000", function () {
				var fee = getFee({type: 2});
				(fee).should.be.type("number").and.equal(1000000000000);
			});

			it("should be equal 100000000", function () {
				var fee = getFee({type: 3});
				(fee).should.be.type("number").and.equal(100000000);
			});
		});

		describe("fixedPoint", function () {
			var fixedPoint = crypto.fixedPoint;

			it("should be ok", function () {
				(fixedPoint).should.be.ok;
			})

			it("should be number", function () {
				(fixedPoint).should.be.type("number").and.not.NaN;
			});

			it("should be equal 100000000", function () {
				(fixedPoint).should.be.equal(100000000);
			});
		});

		describe("#sign", function () {
			var sign = crypto.sign;

			it("should be ok", function () {
				(sign).should.be.ok;
			});

			it("should be a function", function () {
				(sign).should.be.type("function");
			});
		});

		describe("#secondSign", function () {
			var secondSign = crypto.secondSign;

			it("should be ok", function () {
				(secondSign).should.be.ok;
			});

			it("should be a function", function () {
				(secondSign).should.be.type("function");
			});
		});

		describe("#getKeys", function () {
			var getKeys = crypto.getKeys;

			it("should be ok", function () {
				(getKeys).should.be.ok;
			});

			it("should be a function", function () {
				(getKeys).should.be.type("function");
			});

			it("should return two keys in hex", function () {
				var keys = getKeys("secret");

				(keys).should.be.ok;
				(keys).should.be.type("object");
				(keys).should.have.property("publicKey");
				(keys).should.have.property("privateKey");
				(keys.publicKey).should.be.type("string").and.match(function () {
					try {
						new Buffer(keys.publicKey, "hex");
					} catch (e) {
						return false;
					}

					return true;
				});
				(keys.privateKey).should.be.type("string").and.match(function () {
					try {
						new Buffer(keys.privateKey, "hex");
					} catch (e) {
						return false;
					}

					return true;
				});
			});
		});

		describe("#getAddress", function () {
			var getAddress = crypto.getAddress;

			it("should be ok", function () {
				(getAddress).should.be.ok;
			})

			it("should be a function", function () {
				(getAddress).should.be.type("function");
			});

			it("should generate address by publicKey", function () {
				var keys = crypto.getKeys("secret");
				var address = getAddress(keys.publicKey);

				(address).should.be.ok;
				(address).should.be.type("string");
				(address).should.be.equal("18160565574430594874L");
			});
		});

		describe("#verify", function () {
			var verify = crypto.verify;

			it("should be ok", function () {
				(verify).should.be.ok;
			})

			it("should be function", function () {
				(verify).should.be.type("function");
			});
		});

		describe("#verifySecondSignature", function () {
			var verifySecondSignature = crypto.verifySecondSignature;

			it("should be ok", function () {
				(verifySecondSignature).should.be.ok;
			});

			it("should be function", function () {
				(verifySecondSignature).should.be.type("function");
			});
		});
	});

	describe("dapp.js", function () {
		var dapp = lisk.dapp;

		it("should be object", function () {
			(dapp).should.be.type("object");
		});

		it("should have properties", function () {
			(dapp).should.have.property("createDapp");
		})

		describe("#createDapp", function () {
			var createDapp = dapp.createDapp;
			var trs = null;

			var options = {
				category: 0,
				name: "Lisk Guestbook",
				description: "The official Lisk guestbook",
				tags: "guestbook message sidechain",
				type: 0,
				link: "https://github.com/MaxKK/guestbookDapp/archive/master.zip",
				icon: "https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png"
			};

			it("should be a function", function () {
				(createDapp).should.be.type("function");
			});

			it("should create dapp without second signature", function () {
				trs = createDapp("secret", null, options);
				(trs).should.be.ok;
			});

			it("should create delegate with second signature", function () {
				trs = createDapp("secret", "secret 2", options);
				(trs).should.be.ok;
			});

			describe("returned dapp", function () {
				var keys = lisk.crypto.getKeys("secret");
				var secondKeys = lisk.crypto.getKeys("secret 2");

				it("should be object", function () {
					(trs).should.be.type("object");
				});

				it("should have id as string", function () {
					(trs.id).should.be.type("string");
				});

				it("should have type as number and equal 9", function () {
					(trs.type).should.be.type("number").and.equal(5);
				});

				it("should have amount as number and eqaul 0", function () {
					(trs.amount).should.be.type("number").and.equal(0);
				});

				it("should have fee as number and equal 2500000000", function () {
					(trs.fee).should.be.type("number").and.equal(2500000000);
				});

				it("should have null recipientId", function () {
					trs.should.have.property("recipientId").equal(null);
				});

				it("should have senderPublicKey as hex string", function () {
					(trs.senderPublicKey).should.be.type("string").and.match(function () {
						try {
							new Buffer(trs.senderPublicKey, "hex")
						} catch (e) {
							return false;
						}

						return true;
					})
				});

				it("should have timestamp as number", function () {
					(trs.timestamp).should.be.type("number").and.not.NaN;
				});

				it("should have dapp inside asset", function () {
					(trs.asset).should.have.property("dapp");
				});

				describe("dapp asset", function () {
					it("should be ok", function () {
						(trs.asset.dapp).should.be.ok;
					})

					it("should be object", function () {
						(trs.asset.dapp).should.be.type("object");
					});

					it("should have category property", function () {
						(trs.asset.dapp).should.have.property("category").and.equal(options.category);
					});

					it("should have name property", function () {
						(trs.asset.dapp).should.have.property("name").and.equal(options.name);
					});

					it("should have tags property", function () {
						(trs.asset.dapp).should.have.property("tags").and.equal(options.tags);
					});

					it("should have type property", function () {
						(trs.asset.dapp).should.have.property("type").and.equal(options.type);
					});

					it("should have link property", function () {
						(trs.asset.dapp).should.have.property("link").and.equal(options.link);
					});

					it("should have icon property", function () {
						(trs.asset.dapp).should.have.property("icon").and.equal(options.icon);
					});
				});

				it("should have signature as hex string", function () {
					(trs.signature).should.be.type("string").and.match(function () {
						try {
							new Buffer(trs.signature, "hex")
						} catch (e) {
							return false;
						}

						return true;
					})
				});

				it("should have second signature in hex", function () {
					(trs).should.have.property("signSignature").and.type("string").and.match(function () {
						try {
							new Buffer(trs.signSignature, "hex");
						} catch (e) {
							return false;
						}

						return true;
					});
				});

				it("should be signed correctly", function () {
					var result = lisk.crypto.verify(trs);
					(result).should.be.ok;
				});

				it("should not be signed correctly now", function () {
					trs.amount = 10000;
					var result = lisk.crypto.verify(trs);
					(result).should.be.not.ok;
				});

				it("should be second signed correctly", function () {
					trs.amount = 0;
					var result = lisk.crypto.verifySecondSignature(trs, secondKeys.publicKey);
					(result).should.be.ok;
				});

				it("should not be second signed correctly now", function () {
					trs.amount = 10000;
					var result = lisk.crypto.verifySecondSignature(trs, secondKeys.publicKey);
					(result).should.be.not.ok;
				});
			});
		});
	});

	describe("delegate.js", function () {
		var delegate = lisk.delegate;

		it("should be ok", function () {
			(delegate).should.be.ok;
		});

		it("should be function", function () {
			(delegate).should.be.type("object");
		});

		it("should have property createDelegate", function () {
			(delegate).should.have.property("createDelegate");
		});

		describe("#createDelegate", function () {
			var createDelegate = delegate.createDelegate;
			var trs = null;

			it("should be ok", function () {
				(createDelegate).should.be.ok;
			});

			it("should be function", function () {
				(createDelegate).should.be.type("function");
			});

			it("should create delegate", function () {
				trs = createDelegate("secret", "delegate", "secret 2");
			});

			describe("returned delegate", function () {
				var keys = lisk.crypto.getKeys("secret");
				var secondKeys = lisk.crypto.getKeys("secret 2");

				it("should be ok", function () {
					(trs).should.be.ok;
				});

				it("should be object", function () {
					(trs).should.be.type("object");
				});

				it("should have recipientId equal null", function () {
					(trs).should.have.property("recipientId").and.type("object").and.be.empty;
				})

				it("shoud have amount equal 0", function () {
					(trs).should.have.property("amount").and.type("number").and.equal(0);
				})

				it("should have type equal 0", function () {
					(trs).should.have.property("type").and.type("number").and.equal(2);
				});

				it("should have timestamp number", function () {
					(trs).should.have.property("timestamp").and.type("number");
				});

				it("should have senderPublicKey in hex", function () {
					(trs).should.have.property("senderPublicKey").and.type("string").and.match(function () {
						try {
							new Buffer(trs.senderPublicKey, "hex");
						} catch (e) {
							return false;
						}

						return true;
					}).and.equal(keys.publicKey);
				});

				it("should have signature in hex", function () {
					(trs).should.have.property("signature").and.type("string").and.match(function () {
						try {
							new Buffer(trs.signature, "hex");
						} catch (e) {
							return false;
						}

						return true;
					});
				});

				it("should have second signature in hex", function () {
					(trs).should.have.property("signSignature").and.type("string").and.match(function () {
						try {
							new Buffer(trs.signSignature, "hex");
						} catch (e) {
							return false;
						}

						return true;
					});
				});

				it("should have delegate asset", function () {
					(trs).should.have.property("asset").and.type("object");
					(trs.asset).should.have.have.property("delegate");
				})

				it("should be signed correctly", function () {
					var result = lisk.crypto.verify(trs, keys.publicKey);
					(result).should.be.ok;
				});

				it("should be second signed correctly", function () {
					var result = lisk.crypto.verifySecondSignature(trs, secondKeys.publicKey);
					(result).should.be.ok;
				});

				it("should not be signed correctly now", function () {
					trs.amount = 100;
					var result = lisk.crypto.verify(trs, keys.publicKey);
					(result).should.be.not.ok;
				});

				it("should not be second signed correctly now", function () {
					trs.amount = 100;
					var result = lisk.crypto.verify(trs, secondKeys.publicKey);
					(result).should.be.not.ok;
				});

				describe("delegate asset", function () {
					it("should be ok", function () {
						(trs.asset.delegate).should.be.ok;
					});

					it("should be object", function () {
						(trs.asset.delegate).should.be.type("object");
					});

					it("should be have property username", function () {
						(trs.asset.delegate).should.have.property("username").and.be.type("string").and.equal("delegate");
					});
				});
			});
		});
	});

	describe("multisignature.js", function () {
	});

	describe("signature.js", function () {
		var signature = lisk.signature;
		it("should be ok", function () {
			(signature).should.be.ok;
		});

		it("should be object", function () {
			(signature).should.be.type("object");
		});

		it("should have properties", function () {
			(signature).should.have.property("createSignature");
		});

		describe("#createSignature", function () {
			var createSignature = signature.createSignature;
			var sgn = null;

			it("should be function", function () {
				(createSignature).should.be.type("function");
			});

			it("should create signature transaction", function () {
				sgn = createSignature("secret", "second secret");
				(sgn).should.be.ok;
				(sgn).should.be.type("object");
			});

			describe("returned signature transaction", function () {
				it("should have empty recipientId", function () {
					(sgn).should.have.property("recipientId").equal(null);
				});

				it("should have amount equal 0", function () {
					(sgn.amount).should.be.type("number").equal(0);
				});

				it("should have asset", function () {
					(sgn.asset).should.be.type("object");
					(sgn.asset).should.be.not.empty;
				});

				it("should have signature inside asset", function () {
					(sgn.asset).should.have.property("signature");
				});

				describe("signature asset", function () {
					it("should be ok", function () {
						(sgn.asset.signature).should.be.ok;
					})

					it("should be object", function () {
						(sgn.asset.signature).should.be.type("object");
					});

					it("should have publicKey property", function () {
						(sgn.asset.signature).should.have.property("publicKey");
					});

					it("should have publicKey in hex", function () {
						(sgn.asset.signature.publicKey).should.be.type("string").and.match(function () {
							try {
								new Buffer(sgn.asset.signature.publicKey);
							} catch (e) {
								return false;
							}

							return true;
						});
					});

					it("should have publicKey in 32 bytes", function () {
						var publicKey = new Buffer(sgn.asset.signature.publicKey, "hex");
						(publicKey.length).should.be.equal(32);
					});
				});
			});
		});
	});

	describe("slots.js", function () {
		var slots = require("../lib/time/slots.js");

		it("should be ok", function () {
			(slots).should.be.ok;
		});

		it("should be object", function () {
			(slots).should.be.type("object");
		});

		it("should have properties", function () {
			var properties = ["interval", "delegates", "getTime", "getRealTime", "getSlotNumber", "getSlotTime", "getNextSlot", "getLastSlot"];
			properties.forEach(function (property) {
				(slots).should.have.property(property);
			});
		});

		describe(".interval", function () {
			var interval = slots.interval;

			it("should be ok", function () {
				(interval).should.be.ok;
			});

			it("should be number and not NaN", function () {
				(interval).should.be.type("number").and.not.NaN;
			});
		});

		describe(".delegates", function () {
			var delegates = slots.delegates;

			it("should be ok", function () {
				(delegates).should.be.ok;
			});

			it("should be number and not NaN", function () {
				(delegates).should.be.type("number").and.not.NaN;
			});
		});

		describe("#getTime", function () {
			var getTime = slots.getTime;

			it("should be ok", function () {
				(getTime).should.be.ok;
			});

			it("should be a function", function () {
				(getTime).should.be.type("function");
			});

			it("should return epoch time as number, equal to 196144", function () {
				var d = 1428733744000;
				var time = getTime(d);
				(time).should.be.ok;
				(time).should.be.type("number").and.equal(196144);
			});
		});

		describe("#getRealTime", function () {
			var getRealTime = slots.getRealTime;

			it("should be ok", function () {
				(getRealTime).should.be.ok;
			});

			it("should be a function", function () {
				(getRealTime).should.be.type("function");
			});

			it("should return return real time, convert 196144 to 1428733744000", function () {
				var d = 196144;
				var real = getRealTime(d);
				(real).should.be.ok;
				(real).should.be.type("number").and.equal(1428733744000);
			});
		});

		describe("#getSlotNumber", function () {
			var getSlotNumber = slots.getSlotNumber;

			it("should be ok", function () {
				(getSlotNumber).should.be.ok;
			});

			it("should be a function", function () {
				(getSlotNumber).should.be.type("function");
			});

			it("should return slot number, equal to 19614", function () {
				var d = 196144;
				var slot = getSlotNumber(d);
				(slot).should.be.ok;
				(slot).should.be.type("number").and.equal(19614);
			});
		});

		describe("#getSlotTime", function () {
			var getSlotTime = slots.getSlotTime;

			it("should be ok", function () {
				(getSlotTime).should.be.ok;
			});

			it("should be function", function () {
				(getSlotTime).should.be.type("function");
			});

			it("should return slot time number, equal to ", function () {
				var slot = 19614;
				var slotTime = getSlotTime(19614);
				(slotTime).should.be.ok;
				(slotTime).should.be.type("number").and.equal(196140);
			});
		});

		describe("#getNextSlot", function () {
			var getNextSlot = slots.getNextSlot;

			it("should be ok", function () {
				(getNextSlot).should.be.ok;
			});

			it("should be function", function () {
				(getNextSlot).should.be.type("function");
			});

			it("should return next slot number", function () {
				var nextSlot = getNextSlot();
				(nextSlot).should.be.ok;
				(nextSlot).should.be.type("number").and.not.NaN;
			});
		});

		describe("#getLastSlot", function () {
			var getLastSlot = slots.getLastSlot;

			it("should be ok", function () {
				(getLastSlot).should.be.ok;
			});

			it("should be function", function () {
				(getLastSlot).should.be.type("function");
			});

			it("should return last slot number", function () {
				var lastSlot = getLastSlot(slots.getNextSlot());
				(lastSlot).should.be.ok;
				(lastSlot).should.be.type("number").and.not.NaN;
			});
		});
	});

	describe("transaction.js", function () {
		var transaction = lisk.transaction;

		it("should be object", function () {
			(transaction).should.be.type("object");
		});

		it("should have properties", function () {
			(transaction).should.have.property("createTransaction");
		})

		describe("#createTransaction", function () {
			var createTransaction = transaction.createTransaction;
			var trs = null;

			it("should be a function", function () {
				(createTransaction).should.be.type("function");
			});

			it("should create transaction without second signature", function () {
				trs = createTransaction("58191285901858109L", 1000, "secret");
				(trs).should.be.ok;
			});

			describe("returned transaction", function () {
				it("should be object", function () {
					(trs).should.be.type("object");
				});

				it("should have id as string", function () {
					(trs.id).should.be.type("string");
				});

				it("should have type as number and eqaul 0", function () {
					(trs.type).should.be.type("number").and.equal(0);
				});

				it("should have timestamp as number", function () {
					(trs.timestamp).should.be.type("number").and.not.NaN;
				});

				it("should have senderPublicKey as hex string", function () {
					(trs.senderPublicKey).should.be.type("string").and.match(function () {
						try {
							new Buffer(trs.senderPublicKey, "hex")
						} catch (e) {
							return false;
						}

						return true;
					})
				});

				it("should have recipientId as string and to be equal 58191285901858109L", function () {
					(trs.recipientId).should.be.type("string").and.equal("58191285901858109L");
				});

				it("should have amount as number and eqaul to 1000", function () {
					(trs.amount).should.be.type("number").and.equal(1000);
				});

				it("should have empty asset object", function () {
					(trs.asset).should.be.type("object").and.empty;
				});

				it("should does not have second signature", function () {
					(trs).should.not.have.property("signSignature");
				});

				it("should have signature as hex string", function () {
					(trs.signature).should.be.type("string").and.match(function () {
						try {
							new Buffer(trs.signature, "hex")
						} catch (e) {
							return false;
						}

						return true;
					})
				});

				it("should be signed correctly", function () {
					var result = lisk.crypto.verify(trs);
					(result).should.be.ok;
				});

				it("should not be signed correctly now", function () {
					trs.amount = 10000;
					var result = lisk.crypto.verify(trs);
					(result).should.be.not.ok;
				});
			});
		});

		describe("#createTransaction with second secret", function () {
			var createTransaction = transaction.createTransaction;
			var trs = null;
			var secondSecret = "second secret";
			var keys = lisk.crypto.getKeys(secondSecret);

			it("should be a function", function () {
				(createTransaction).should.be.type("function");
			});

			it("should create transaction without second signature", function () {
				trs = createTransaction("58191285901858109L", 1000, "secret", secondSecret);
				(trs).should.be.ok;
			});

			describe("returned transaction", function () {
				it("should be object", function () {
					(trs).should.be.type("object");
				});

				it("should have id as string", function () {
					(trs.id).should.be.type("string");
				});

				it("should have type as number and eqaul 0", function () {
					(trs.type).should.be.type("number").and.equal(0);
				});

				it("should have timestamp as number", function () {
					(trs.timestamp).should.be.type("number").and.not.NaN;
				});

				it("should have senderPublicKey as hex string", function () {
					(trs.senderPublicKey).should.be.type("string").and.match(function () {
						try {
							new Buffer(trs.senderPublicKey, "hex")
						} catch (e) {
							return false;
						}

						return true;
					})
				});

				it("should have recipientId as string and to be equal 58191285901858109L", function () {
					(trs.recipientId).should.be.type("string").and.equal("58191285901858109L");
				});

				it("should have amount as number and eqaul to 1000", function () {
					(trs.amount).should.be.type("number").and.equal(1000);
				});

				it("should have empty asset object", function () {
					(trs.asset).should.be.type("object").and.empty;
				});

				it("should have second signature", function () {
					(trs).should.have.property("signSignature");
				});

				it("should have signature as hex string", function () {
					(trs.signature).should.be.type("string").and.match(function () {
						try {
							new Buffer(trs.signature, "hex")
						} catch (e) {
							return false;
						}

						return true;
					})
				});

				it("should have signSignature as hex string", function () {
					(trs.signSignature).should.be.type("string").and.match(function () {
						try {
							new Buffer(trs.signSignature, "hex");
						} catch (e) {
							return false;
						}

						return true;
					});
				});

				it("should be signed correctly", function () {
					var result = lisk.crypto.verify(trs);
					(result).should.be.ok;
				});

				it("should be second signed correctly", function () {
					var result = lisk.crypto.verifySecondSignature(trs, keys.publicKey);
					(result).should.be.ok;
				});

				it("should not be signed correctly now", function () {
					trs.amount = 10000;
					var result = lisk.crypto.verify(trs);
					(result).should.be.not.ok;
				});

				it("should not be second signed correctly now", function () {
					trs.amount = 10000;
					var result = lisk.crypto.verifySecondSignature(trs, keys.publicKey);
					(result).should.be.not.ok;
				});
			});
		});
	});

	describe("transfer.js", function () {
	});

	describe("vote.js", function () {
		var vote = lisk.vote;

		it("should be ok", function () {
			(vote).should.be.ok;
		});

		it("should be object", function () {
			(vote).should.be.type("object");
		});

		it("should have createVote property", function () {
			(vote).should.have.property("createVote");
		});

		describe("#createVote", function () {
			var createVote = vote.createVote,
				vt = null,
				publicKey = lisk.crypto.getKeys("secret").publicKey,
				publicKeys = ["+" + publicKey];

			it("should be ok", function () {
				(createVote).should.be.ok;
			});

			it("should be function", function () {
				(createVote).should.be.type("function");
			});

			it("should create vote", function () {
				vt = createVote("secret", publicKeys, "second secret");
			});

			describe("returned vote", function () {
				it("should be ok", function () {
					(vt).should.be.ok;
				});

				it("should be object", function () {
					(vt).should.be.type("object");
				});

				it("should have recipientId string equal to sender", function () {
					(vt).should.have.property("recipientId").and.be.type("string").and.equal(lisk.crypto.getAddress(publicKey))
				});

				it("should have amount number eaul to 0", function () {
					(vt).should.have.property("amount").and.be.type("number").and.equal(0);
				});

				it("should have type number equal to 3", function () {
					(vt).should.have.property("type").and.be.type("number").and.equal(3);
				});

				it("should have timestamp number", function () {
					(vt).should.have.property("timestamp").and.be.type("number");
				});

				it("should have senderPublicKey hex string equal to sender public key", function () {
					(vt).should.have.property("senderPublicKey").and.be.type("string").and.match(function () {
						try {
							new Buffer(vt.senderPublicKey, "hex");
						} catch (e) {
							return false;
						}

						return true;
					}).and.equal(publicKey);
				});

				it("should have signature hex string", function () {
					(vt).should.have.property("signature").and.be.type("string").and.match(function () {
						try {
							new Buffer(vt.signature, "hex");
						} catch (e) {
							return false;
						}

						return true;
					});
				});

				it("should have second signature hex string", function () {
					(vt).should.have.property("signSignature").and.be.type("string").and.match(function () {
						try {
							new Buffer(vt.signSignature, "hex");
						} catch (e) {
							return false;
						}

						return true;
					});
				});

				it("should be signed correctly", function () {
					var result = lisk.crypto.verify(vt);
					(result).should.be.ok;
				});

				it("should be second signed correctly", function () {
					var result = lisk.crypto.verifySecondSignature(vt, lisk.crypto.getKeys("second secret").publicKey);
					(result).should.be.ok;
				});

				it("should not be signed correctly now", function () {
					vt.amount = 100;
					var result = lisk.crypto.verify(vt);
					(result).should.be.not.ok;
				});

				it("should not be second signed correctly now", function () {
					vt.amount = 100;
					var result = lisk.crypto.verifySecondSignature(vt, lisk.crypto.getKeys("second secret").publicKey);
					(result).should.be.not.ok;
				});

				it("should have asset", function () {
					(vt).should.have.property("asset").and.not.empty;
				});

				describe("vote asset", function () {
					it("should be ok", function () {
						(vt.asset).should.have.property("votes").and.be.ok;
					});

					it("should be object", function () {
						(vt.asset.votes).should.be.type("object");
					});

					it("should be not empty", function () {
						(vt.asset.votes).should.be.not.empty;
					});

					it("should contains one element", function () {
						(vt.asset.votes.length).should.be.equal(1);
					});

					it("should have public keys in hex", function () {
						vt.asset.votes.forEach(function (v) {
							(v).should.be.type("string").startWith("+").and.match(function () {
								try {
									new Buffer(v.substring(1, v.length), "hex");
								} catch (e) {
									return false;
								}

								return true;
							});
						});
					});

					it("should be equal to sender public key", function () {
						var v = vt.asset.votes[0];
						(v.substring(1, v.length)).should.be.equal(publicKey);
					});
				})
			});
		});
	});

});
