var util = require('util');

var errorCodes = {
	VOTES: {
		INCORRECT_RECIPIENT: {
			message: "Invalid recipient ID: %s. Recipient ID identical to sender ID",
			args: ['recipientId']
		},
		MINIMUM_DELEGATES_VOTE: {
			message: "Not enough spare votes available: %s",
			args: ["id"]
		},
		MAXIMUM_DELEGATES_VOTE: {
			message: "Voting is limited to 33 delegates at any one time, and 101 delegates in total: TX ID: %s",
			args: ["id"]
		},
		ALREADY_VOTED_UNCONFIRMED: {
			message: "It appears you already voted for this delegate: TX ID: %s",
			args: ["id"]
		},
		ALREADY_VOTED_CONFIRMED: {
			message: "You already voted for this delegate: TX ID: %s",
			args: ["id"]
		}
	},
	USERNAMES: {
		INCORRECT_RECIPIENT: {
			message: "Invalid recipient. Please try again",
			args: []
		},
		INVALID_AMOUNT: {
			message: "Invalid transaction amount. Please try again. TX ID: %s",
			args: ["id"]
		},
		EMPTY_ASSET: {
			message: "Empty username transaction asset. Please try again. TX ID: %s",
			args: ["id"]
		},
		ALLOW_CHARS: {
			message: "Username can only contain alphanumeric characters with the exception of !@$&_. TX ID: %s",
			args: ["id"]
		},
		USERNAME_LIKE_ADDRESS: {
			message: "Username cannot be a potential lisk address. TX ID: %s",
			args: ["id"]
		},
		INCORRECT_USERNAME_LENGTH: {
			message: "Invalid username length. Please use 1 to 20 alphanumeric characters. Username: %s",
			args: ["asset.username.alias"]
		},
		EXISTS_USERNAME: {
			message: "Username is already in use. Please try a different name. TX ID: %s",
			args: ["id"]
		},
		ALREADY_HAVE_USERNAME: {
			message: "You already have a username. You can only have one username",
			args: ["id"]
		}
	},
	ACCOUNTS: {
		ACCOUNT_PUBLIC_KEY_NOT_FOUND: {
			message: "Unable to find account public key for the address: %s",
			args: ["address"]
		},
		ACCOUNT_DOESNT_FOUND: {
			message: "Account not found. Address: %s",
			args: ["address"]
		},
		INVALID_ADDRESS: {
			message: "%s is an invalid address. Please provide a valid Lisk address",
			args: ["address"]
		}
	},
	DELEGATES: {
		INVALID_RECIPIENT: {
			message: "Invalid recipient ID. TX ID: %s",
			args: ["id"]
		},
		INVALID_AMOUNT: {
			message: "Invalid transaction amount: %i. Please try again",
			args: ["amount"]
		},
		EMPTY_TRANSACTION_ASSET: {
			message: "Empty delegate transaction asset. TX ID: %s",
			args: ["id"]
		},
		USERNAME_CHARS: {
			message: "Delegate names can only contain alphanumeric characters with the exception of !@$&_.",
			args: ["asset.delegate.username"]
		},
		USERNAME_LIKE_ADDRESS: {
			message: "Delegate names cannot be a potential lisk address",
			args: ["asset.delegate.username"]
		},
		USERNAME_IS_TOO_SHORT: {
			message: "Delegate name is too short. Please use 1 to 20 characters",
			args: ["asset.delegate.username"]
		},
		USERNAME_IS_TOO_LONG: {
			message: "Delegate name is longer then 20 characters. Please use 1 to 20 characters",
			args: ["asset.delegate.username"]
		},
		EXISTS_USERNAME: {
			message: "Delegate name is already in use. Please try a different name",
			args: ["asset.delegate.username"]
		},
		EXISTS_DELEGATE: {
			message: "Your account is already registered as a delegate",
			args: []
		},
		DELEGATE_NOT_FOUND: {
			message: "Delegate not found",
			args: []
		},
		FORGER_PUBLIC_KEY: {
			message: "Please provide generatorPublicKey in request",
			args: []
		},
		FORGING_ALREADY_ENABLED: {
			message: "Forging is already enabled",
			args: []
		},
		DELEGATE_NOT_FOUND: {
			message: "Delegate not found. Please check your password",
			args: []
		},
		FORGER_NOT_FOUND: {
			message: "Provided publicKey does not appear to belong to any delegate",
			args: []
		},
		WRONG_USERNAME: {
			message: "Wrong delegate name",
			args: []
		}
	},
	PEERS: {
		PEER_NOT_FOUND: {
			message: "Peers not found",
			args: []
		},
		LIMIT: {
			message: "Maximum limit is %i. Please try again",
			args: ['limit']
		},
		INVALID_PEER: {
			message: "Peers: Engine is starting",
			args: []
		}
	},
	COMMON: {
		LOADIND: {
			message: "Please wait: Engine is starting",
			args: []
		},
		DB_ERR: {
			message: "DB system error",
			args: []
		},
		INVALID_API: {
			message: "API request was not found. Please check your request and try again",
			args: []
		},
		INVALID_SECRET_KEY: {
			message: "Invalid password. Please try again",
			args: []
		},
		OPEN_ACCOUNT: {
			message: "To send a transaction, you must first log in your account",
			args: []
		},
		SECOND_SECRET_KEY: {
			message: "Please provide secondary account password",
			args: []
		},
		ACCESS_DENIED: {
			message: "Access denied. Please check access permissions in config file, whitelist section",
			args: []
		}
	},
	BLOCKS: {
		BLOCK_NOT_FOUND: {
			message: "Block not found",
			args: []
		},
		WRONG_ID_SEQUENCE: {
			message: "Invalid ID sequence",
			args: []
		}
	},
	TRANSACTIONS: {
		INVALID_RECIPIENT: {
			message: "Invalid recipient ID: %s. Please try again",
			args: ["recipientId"]
		},
		INVALID_AMOUNT: {
			message: "Invalid transaction amount. You cannot send %i LISK. Please try again",
			args: ["amount"]
		},
		TRANSACTION_NOT_FOUND: {
			message: "Transaction not found",
			args: []
		},
		TRANSACTIONS_NOT_FOUND: {
			message: "Transactions not found",
			args: []
		},
		RECIPIENT_NOT_FOUND: {
			message: "Recipient not found",
			args: []
		},
		INVALID_ADDRESS: {
			message: "%s is an invalid address. Please provide a valid Lisk address",
			args: ["address"]
		}
	},
	SIGNATURES: {
		INVALID_ASSET: {
			message: "Empty signature transaction asset. TX ID: %s",
			args: ["id"]
		},
		INVALID_AMOUNT: {
			message: "Invalid transaction amount: %i",
			args: ["amount"]
		},
		INVALID_LENGTH: {
			message: "Invalid length for signature public key. TX ID: %s",
			args: ["id"]
		},
		INVALID_HEX: {
			message: "Invalid hex found in signature public key. TX ID: %s",
			args: ["id"]
		}
	},
	CONTACTS: {
		USERNAME_DOESNT_FOUND: {
			message: "Account not found: %s",
			args: []
		},
		SELF_FRIENDING: {
			message: "You cannot add yourself as your own contact",
			args: []
		},
		ALREADY_ADDED_UNCONFIRMED: {
			message: "Account is already your contact",
			args: []
		},
		ALREADY_ADDED_CONFIRMED: {
			message: "Account is already your contact",
			args: []
		}
	},
	MULTISIGNATURES: {
		SIGN_NOT_ALLOWED: {
			message: "Permission to sign transaction denied: %s",
			args: ["id"]
		},
		NOT_UNIQUE_SET: {
			message: "publicKeys array is not unique",
			args: []
		},
		SELF_SIGN: {
			message: "Permission to sign transaction using own public key denied",
			args: []
		}
	},
	DAPPS: {
		STORAGE_MISSED: {
			message: "Missing storage option. Please select where your DApp is hosted, Github or sia",
			args: []
		},
		EXISTS_DAPP: {
			message: "DApp already exists",
			args: []
		},
		UNKNOWN_CATEGORY: {
			message: "Unknown DApp category",
			args: []
		},
		EMPTY_NICKNAME: {
			message: "DApp has an empty sia file name",
			args: []
		},
		UNKNOWN_TYPE: {
			message: "Unknown DApp type",
			args: []
		},
		GIT_AND_SIA: {
			message: "DApp must contain either a github or sia storage link, not both",
			args: []
		},
		INVALID_GIT: {
			message: "DApp git link appears to be invalid",
			args: []
		},
		EMPTY_NAME: {
			message: "DApp name cannot be empty",
			args: []
		},
		TOO_LONG_NAME: {
			message: "DApp name is too long",
			args: []
		},
		TOO_LONG_DESCRIPTION: {
			message: "DApp description is too long",
			args: []
		},
		TOO_LONG_TAGS: {
			message: "One or more DApp tags are too long",
			args: []
		},
		EXISTS_DAPP_NAME: {
			message: "Dapp name already exists. Please try a different name",
			args: []
		},
		EXISTS_DAPP_NICKNAME: {
			message: "A DApp with the same sia file name already exists",
			args: []
		},
		EXISTS_DAPP_GIT: {
			message: "A DApp with the same git link already exists",
			args: []
		},
		INCORRECT_LINK: {
			message: "DApp must contain either a sia file nickname or a link",
			args: []
		},
		DAPPS_NOT_FOUND: {
			message: "DApps not found",
			args: []
		},
		MISSED_SIA_ASCII: {
			message: "Missing sia ascii code",
			args: []
		},
		INCORRECT_ASCII_SIA: {
			message: "Incorrect sia ascii code: %s",
			args: ["siaAscii"]
		},
		INCORRECT_SIA_ICON: {
			message: "Incorrect sia ascii icon: %s",
			args: ["siaIcon"]
		},
		ALREADY_SIA_ICON: {
			message: "Dapp already has a sia icon code",
			args: []
		},
		INCORRECT_ICON_LINK: {
			message: "Incorrect icon link: %s",
			args: ['icon']
		}
	}
}
function error(code, object) {
	var codes = code.split('.');
	var errorRoot = errorCodes[codes[0]];
	if (!errorRoot) return code;
	var errorObj = errorRoot[codes[1]];
	if (!errorObj) return code;

	var args = [errorObj.message];
	errorObj.args.forEach(function (el) {
		var value = null;

		try {
			if (el.indexOf('.') > 0) {
				var els = el.split('.');
				value = object;

				els.forEach(function (subel) {
					value = value[subel];
				});
			} else {
				value = object[el];
			}
		}catch (e){
			value = 0
		}

		args.push(value);
	});

	var error = util.format.apply(this, args);
	return error;
}

module.exports = {
	errorCodes: errorCodes,
	error: error
};
