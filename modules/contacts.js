var TransactionTypes = require('../helpers/transaction-types.js'),
	Router = require('../helpers/router.js'),
	constants = require('../helpers/constants.js'),
	ed = require('ed25519'),
	ByteBuffer = require("bytebuffer"),
	crypto = require('crypto'),
	Diff = require('../helpers/diff.js'),
	async = require('async'),
	util = require('util'),
	errorCode = require('../helpers/errorCodes.js').error,
	sandboxHelper = require('../helpers/sandbox.js');

var modules, library, self, private = {}, shared = {};

function Contact() {
	this.create = function (data, trs) {
		trs.recipientId = null;
		trs.amount = 0;

		trs.asset.contact = {
			address: data.contactAddress
		}

		return trs;
	}

	this.calculateFee = function (trs, sender) {
		return 1 * constants.fixedPoint;
	}

	this.verify = function (trs, sender, cb) {
		if (!trs.asset.contact) {
			return setImmediate(cb, "Invalid asset: " + trs.id);
		}

		if (!trs.asset.contact.address) {
			return setImmediate(cb, "Empty following: " + trs.id);
		}

		var isAddress = /^[\+|\-][0-9]+[L|l]$/g;
		if (!isAddress.test(trs.asset.contact.address.toLowerCase())) {
			return setImmediate(cb, "Following is not address: " + trs.asset.contact.address);
		}

		if (trs.amount != 0) {
			return setImmediate(cb, "Invalid amount: " + trs.id);
		}

		if (trs.recipientId) {
			return setImmediate(cb, "Invalid recipientId: " + trs.id);
		}

		self.checkContacts(trs.senderPublicKey, [trs.asset.contact.address], function (err) {
			if (err) {
				return setImmediate(cb, errorCode("CONTACTS.ALREADY_ADDED_CONFIRMED", trs));
			}
			setImmediate(cb, err, trs);
		});
	}

	this.process = function (trs, sender, cb) {
		setImmediate(cb, null, trs);
	}

	this.getBytes = function (trs) {
		try {
			var contactAddress = new Buffer(trs.asset.contact.address, 'utf8');

			var bb = new ByteBuffer(contactAddress.length, true);
			for (var i = 0; i < contactAddress.length; i++) {
				bb.writeByte(contactAddress[i]);
			}

			bb.flip();
		} catch (e) {
			throw Error(e.toString());
		}

		return bb.toBuffer()
	}

	this.apply = function (trs, block, sender, cb) {
		this.scope.account.merge(sender.address,
			{
				contacts: [trs.asset.contact.address],
				blockId: block.id,
				round: modules.round.calc(block.height)
			}, function (err) {
				cb(err);
			});
	}

	this.undo = function (trs, block, sender, cb) {
		var contactsInvert = Diff.reverse([trs.asset.contact.address]);

		this.scope.account.merge(sender.address, {
			contacts: contactsInvert,
			blockId: block.id,
			round: modules.round.calc(block.height)
		}, function (err) {
			cb(err);
		});
	}

	this.applyUnconfirmed = function (trs, sender, cb) {
		self.checkUnconfirmedContacts(trs.senderPublicKey, [trs.asset.contact.address], function (err) {
			if (err) {
				return setImmediate(cb, errorCode("CONTACTS.ALREADY_ADDED_UNCONFIRMED", trs));
			}

			this.scope.account.merge(sender.address, {
				u_contacts: [trs.asset.contact.address]
			}, function (err) {
				cb(err);
			});
		}.bind(this));
	}

	this.undoUnconfirmed = function (trs, sender, cb) {
		var contactsInvert = Diff.reverse([trs.asset.contact.address]);

		this.scope.account.merge(sender.address, {u_contacts: contactsInvert}, function (err) {
			cb(err);
		});
	}

	this.objectNormalize = function (trs) {
		var report = library.scheme.validate(trs.asset.contact, {
			type: "object",
			properties: {
				address: {
					type: "string",
					minLength: 1
				}
			},
			required: ["address"]
		});

		if (!report) {
			throw Error("Incorrect address in contact transaction: " + library.scheme.getLastError());
		}

		return trs;
	}

	this.dbRead = function (raw) {
		if (!raw.c_address) {
			return null;
		} else {
			var contact = {
				transactionId: raw.t_id,
				address: raw.c_address
			}

			return {contact: contact};
		}
	}

	this.dbSave = function (trs, cb) {
		library.dbLite.query("INSERT INTO contacts(address, transactionId) VALUES($address, $transactionId)", {
			address: trs.asset.contact.address,
			transactionId: trs.id
		}, cb);
	}

	this.ready = function (trs, sender) {
		if (sender.multisignatures.length) {
			if (!trs.signatures) {
				return false;
			}
			return trs.signatures.length >= sender.multimin - 1;
		} else {
			return true;
		}
	}
}

// Constructor
function Contacts(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;
	private.attachApi();

	library.logic.transaction.attachAssetType(TransactionTypes.FOLLOW, new Contact());

	setImmediate(cb, null, self);
}

// Private methods
private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) return next();
		res.status(500).send({success: false, error: errorCode('COMMON.LOADING')});
	});

	router.map(shared, {
		"get /unconfirmed": "getUnconfirmedContacts",
		"get /": "getContacts",
		"put /": "addContact",
		"get /fee": "getFee"
	});

	router.use(function (req, res) {
		res.status(500).send({success: false, error: errorCode('COMMON.INVALID_API')});
	});

	library.network.app.use('/api/contacts', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) return next();
		library.logger.error(req.url, err.toString());
		res.status(500).send({success: false, error: err.toString()});
	});
}

// Public methods
Contacts.prototype.checkContacts = function (publicKey, contacts, cb) {
	if (util.isArray(contacts)) {
		modules.accounts.setAccountAndGet({publicKey: publicKey}, function (err, account) {
			if (err) {
				return cb(err);
			}
			if (!account) {
				return cb("Account not found");
			}

			for (var i = 0; i < contacts.length; i++) {
				var math = contacts[i][0];
				var contactAddress = contacts[i].slice(1);

				if (math != '+') {
					return cb("Incorrect math for contact");
				}

				if (math == "+" && (account.contacts !== null && account.contacts.indexOf(contactAddress) != -1)) {
					return cb("Can't verify contacts, you already added this contact");
				}
				if (math == "-" && (account.contacts === null || account.contacts.indexOf(contactAddress) === -1)) {
					return cb("Can't verify contacts, you had no this contact for removing");
				}
			}

			cb();
		});
	} else {
		setImmediate(cb, "Provide array of contacts");
	}
}

Contacts.prototype.checkUnconfirmedContacts = function (publicKey, contacts, cb) {
	var selfAddress = modules.accounts.generateAddressByPublicKey(publicKey);

	if (util.isArray(contacts)) {
		modules.accounts.getAccount({address: selfAddress}, function (err, account) {
			if (err) {
				return cb(err);
			}
			if (!account) {
				return cb("Account not found");
			}

			async.eachSeries(contacts, function (contact, cb) {
				var math = contact[0];
				var contactAddress = contact.slice(1);

				if (math != '+') {
					return cb(errorCode('Incorrect math'));
				}

				// if (contactAddress == selfAddress) {
				// 	return cb(errorCode("CONTACTS.SELF_FRIENDING"));
				// }

				modules.accounts.setAccountAndGet({
					address: contactAddress
				}, function (err) {
					if (err) {
						return cb(err);
					}

					if (math == "+" && (account.u_contacts !== null && account.u_contacts.indexOf(contactAddress) != -1)) {
						return cb("Can't verify contacts, you already voted for this delegate");
					}
					if (math == "-" && (account.u_contacts === null || account.u_contacts.indexOf(contactAddress) === -1)) {
						return cb("Can't verify contacts, you had no contacts for this delegate");
					}

					return cb();
				});

			}, cb);
		});
	} else {
		return setImmediate(cb, "Provide array of contacts");
	}
}

Contacts.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Contacts.prototype.onBind = function (scope) {
	modules = scope;
}

shared.getUnconfirmedContacts = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			publicKey: {
				type: "string",
				format: "publicKey"
			}
		},
		required: ['publicKey']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var transactions = modules.transactions.getUnconfirmedTransactionList();

		var contacts = [];
		async.eachSeries(transactions, function (item, cb) {
			if (item.type != TransactionTypes.FOLLOW) {
				return setImmediate(cb);
			}

			if (item.senderPublicKey == query.publicKey) {
				contacts.push(item);
			}

			setImmediate(cb);
		}, function () {
			return cb(null, {contacts: contacts});
		});
	});
}

// Shared
shared.getContacts = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			publicKey: {
				type: "string",
				format: "publicKey"
			}
		},
		required: ["publicKey"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		query.address = modules.accounts.generateAddressByPublicKey(query.publicKey);

		modules.accounts.getAccount({address: query.address}, function (err, account) {
			if (err) {
				return cb(err.toString());
			}
			if (!account) {
				return cb(errorCode("ACCOUNTS.ACCOUNT_DOESNT_FOUND", {address: query.address}));
			}

			async.series({
				contacts: function (cb) {
					if (!account.contacts.length) {
						return cb(null, []);
					}
					modules.accounts.getAccounts({address: {$in: account.contacts}}, ["address", "username"], cb);
				},
				followers: function (cb) {
					if (!account.followers.length) {
						return cb(null, []);
					}
					modules.accounts.getAccounts({address: {$in: account.followers}}, ["address", "username"], cb);
				}
			}, function (err, res) {
				if (err) {
					return cb(err.toString());
				}

				var realFollowers = [];
				// Find and remove
				for (var i in res.followers) {
					var contact = res.contacts.find(function (item) {
						return item.address == res.followers[i].address;
					});

					if (!contact) {
						realFollowers.push(res.followers[i]);
					}
				}

				cb(null, {following: res.contacts, followers: realFollowers});
			});
		});
	});
}

shared.addContact = function (req, cb) {
	var body = req.body;
	library.scheme.validate(body, {
		type: "object",
		properties: {
			secret: {
				type: "string",
				minLength: 1
			},
			secondSecret: {
				type: "string"
			},
			publicKey: {
				type: "string",
				format: "publicKey"
			},
			following: {
				type: "string",
				minLength: 1
			},
			multisigAccountPublicKey: {
				type: "string",
				format: "publicKey"
			}
		},
		required: ["secret", "following"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
		var keypair = ed.MakeKeypair(hash);

		if (body.publicKey) {
			if (keypair.publicKey.toString('hex') != body.publicKey) {
				return cb(errorCode("COMMON.INVALID_SECRET_KEY"));
			}
		}

		var query = {};

		var followingAddress = body.following.substring(1, body.following.length);
		var isAddress = /^[0-9]+[L|l]$/g;
		if (isAddress.test(followingAddress)) {
			query.address = followingAddress;
		} else {
			query.username = followingAddress;
		}

		library.balancesSequence.add(function (cb) {
			if (body.multisigAccountPublicKey && body.multisigAccountPublicKey != keypair.publicKey.toString('hex')) {
				modules.accounts.getAccount({publicKey: body.multisigAccountPublicKey}, function (err, account) {
					if (err) {
						return cb(err.toString());
					}

					if (!account || !account.publicKey) {
						return cb("Multisignature account not found");
					}

					if (!account.multisignatures || !account.multisignatures) {
						return cb("This account don't have multisignature");
					}

					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return cb("This account don't added to multisignature");
					}

					modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
						if (err) {
							return cb(err.toString());
						}

						if (!requester || !requester.publicKey) {
							return cb(errorCode("COMMON.OPEN_ACCOUNT"));
						}

						if (requester.secondSignature && !body.secondSecret) {
							return cb(errorCode("COMMON.SECOND_SECRET_KEY"));
						}

						if (requester.publicKey == account.publicKey) {
							return cb("Incorrect requester");
						}

						if (!following) {
							return cb(errorCode("CONTACTS.USERNAME_DOESNT_FOUND"));
						}

						followingAddress = body.following[0] + following.address;

						var secondKeypair = null;

						if (requester.secondSignature) {
							var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
							secondKeypair = ed.MakeKeypair(secondHash);
						}

						try {
							var transaction = library.logic.transaction.create({
								type: TransactionTypes.FOLLOW,
								sender: account,
								keypair: keypair,
								secondKeypair: secondKeypair,
								contactAddress: followingAddress,
								requester: keypair
							});
						} catch (e) {
							return cb(e.toString());
						}
						modules.transactions.receiveTransactions([transaction], cb);
					});
				});
			} else {
				modules.accounts.getAccount(query, function (err, following) {
					if (err) {
						return cb(err.toString());
					}

					if (!following) {
						return cb(errorCode("CONTACTS.USERNAME_DOESNT_FOUND"));
					}

					followingAddress = body.following[0] + following.address;

					modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
						if (err) {
							return cb(err.toString());
						}
						if (!account) {
							return cb(errorCode("COMMON.OPEN_ACCOUNT"));
						}

						if (account.secondSignature && !body.secondSecret) {
							return cb(errorCode("COMMON.SECOND_SECRET_KEY"));
						}

						if (account.secondSignature && body.secondSecret) {
							var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
							var secondKeypair = ed.MakeKeypair(secondHash);
						}

						try {
							var transaction = library.logic.transaction.create({
								type: TransactionTypes.FOLLOW,
								sender: account,
								keypair: keypair,
								secondKeypair: secondKeypair,
								contactAddress: followingAddress
							});
						} catch (e) {
							return cb(e.toString());
						}

						modules.transactions.receiveTransactions([transaction], cb);
					});
				});
			}

		}, function (err, transaction) {
			if (err) {
				return cb(err.toString());
			}

			cb(null, {transaction: transaction[0]});
		});
	});
}

shared.getFee = function (req, cb) {
	var query = req.body;
	cb(null, {fee: 1 * constants.fixedPoint})
}

// Export
module.exports = Contacts;
