"use strict";

// Requires
var _ = require("lodash"),
    expect = require("chai").expect,
    chai = require("chai"),
    supertest = require("supertest"),
    async = require("async"),
    request = require("request");

// Node configuration
var config = require("../config.json"),
    baseUrl = "http://" + config.address + ":" + config.port,
    api = supertest(baseUrl + "/api"),
    peer = supertest(baseUrl + "/peer");

config.mocha = {
  "peers": {
    "account": "F3DP835EBuZMAhiuYn2AzhJh1lz8glLolghCMD4X8lRh5v2GlcBWws7plIDUuPjf3GUTOnyYEfXQx7cH",
    "address": "2334212999465599568C",
    "publicKey": "631b91fa537f74e23addccd30555fbc7729ea267c7e0517cbf1bfcc46354abc3"
  }
}

var normalizer = 100000000; // Use this to convert LISK amount to normal value
var blockTime = 10000; // Block time in miliseconds
var blockTimePlus = 12000; // Block time + 2 seconds in miliseconds
var version = "0.1.1" // Node version

// Holds Fee amounts for different transaction types
var Fees = {
  voteFee: 100000000,
  transactionFee: 10000000,
  secondPasswordFee: 10000000000,
  delegateRegistrationFee: 10000000000,
  multisignatureRegistrationFee: 500000000,
  dappAddFee: 50000000000
};

var guestbookDapp = {
  icon: "https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png",
	link: "https://github.com/MaxKK/guestbookDapp/archive/master.zip"
};

// Account info for delegate to register manually
var Daccount = {
  "address": "9946841100442405851L",
  "publicKey": "caf0f4c00cf9240771975e42b6672c88a832f98f01825dda6e001e2aab0bc0cc",
  "password": "1234",
  "secondPassword": "12345",
  "balance": 0,
  "delegateName": "sebastian",
};

// Existing delegate account in blockchain
var Eaccount = {
  "address": "11210991311698004616L",
  "publicKey": "9f7c5f9c5096c5de59a8514c64386960e3b7116938254a4359e104fc12227ff7",
  "password": "Eta3SAounYFXxAeDcCmiQLKS1KKiuKxtD1xgEjE71FaVLxciSK",
  "balance": 0,
  "delegateName": "genesisDelegate100"
};

// List of all transaction types codes
var TxTypes = {
  SEND : 0,
  SIGNATURE : 1,
  DELEGATE : 2,
  VOTE : 3,
  MULTI: 4,
  DAPP: 5
};

var DappType = {
  DAPP : 0,
  FILE: 1
};

var DappCategory = {
  "Common": 0,
  "Business": 1,
  "Catalogs": 2,
  "Education": 3,
  "Entertainment": 4,
  "Multimedia": 5,
  "Networking": 6,
  "Utilities": 7,
  "Games": 8
};

// Account info for genesis account - Needed for voting, registrations and Tx
var Gaccount = {
  "address": "14837479272589364523L",
  "publicKey": "3ed4d689ced148a97017e2f611b5c4aa28de1564a92fca8234d32290319dbdb3",
  "password": "2GgPLLVtafukQWqCPgwRzpn9)irWCZZczkfrKYasG)RLTsvKDB",
  "balance": 10000000000000000
};

// Random LISK Amount
var LISK = Math.floor(Math.random() * (100000 * 100000000)) + 1; // Remove 1 x 0 for reduced fees (delegate + Tx)

// Used to create random delegates names
function randomDelegateName() {
  var size = randomNumber(1,20); // Min. delegate name size is 1, Max. delegate name is 20
  var delegateName = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.";

  for( var i=0; i < size; i++ )
    delegateName += possible.charAt(Math.floor(Math.random() * possible.length));

  return delegateName;
}

// Randomize a property from within an object
function randomProperty(obj, needKey) {
  var keys = Object.keys(obj)

  if (!needKey) {
    return obj[keys[keys.length * Math.random() << 0]];
  } else {
    return keys[keys.length * Math.random() << 0];
  }
};

// Randomizes LISK amount
function randomLISK() {
  return Math.floor(Math.random() * (10000 * 100000000)) + (1000 * 100000000);
}

// Returns current block height
function getHeight(cb) {
  request({
    type: "GET",
    url: baseUrl + "/api/blocks/getHeight",
    json: true
  }, function (err, resp, body) {
    if (err || resp.statusCode != 200) {
      return cb(err || "Status code is not 200 (getHeight)");
    } else {
      return cb(null, body.height);
    }
  })
}

function onNewBlock(cb) {
  getHeight(function(err, height) {
    console.log("Height: " + height);
    if (err) {
      return cb(err);
    } else {
      waitForNewBlock(height, cb);
    }
  });
}

// Function used to wait until a new block has been created
function waitForNewBlock(height, cb) {
  var actualHeight = height;
  async.doWhilst(
    function (cb) {
      request({
        type: "GET",
        url: baseUrl + "/api/blocks/getHeight",
        json: true
      }, function (err, resp, body) {
        if (err || resp.statusCode != 200) {
          return cb(err || "Got incorrect status");
        }

        if (height + 2 == body.height) {
          height = body.height;
        }

        setTimeout(cb, 1000);
      });
    },
    function () {
      return actualHeight == height;
    },
    function (err) {
      if (err) {
        return setImmediate(cb, err);
      } else {
        return setImmediate(cb, null, height);
      }
    }
  )
}

// Adds peers to local node
function addPeers(numOfPeers, cb) {
  var operatingSystems = ["win32","win64","ubuntu","debian", "centos"];
  var ports = [4000, 5000, 7000, 8000];
  var sharePortOptions = [0,1];
  var os,version,port,sharePort;

  var i = 0;
  async.whilst(function () {
    return i < numOfPeers
  }, function (next) {
    os = operatingSystems[randomizeSelection(operatingSystems.length)];
    version = config.version;
    port = ports[randomizeSelection(ports.length)];
    // sharePort = sharePortOptions[randomizeSelection(sharePortOptions.length)];

    request({
      type: "GET",
      url: baseUrl + "/peer/height",
      json: true,
      headers: {
        "version": version,
        "port": port,
        "share-port": 0,
        "os": os
      }
    }, function (err, resp, body) {
      if (err || resp.statusCode != 200) {
        return next(err || "Status code is not 200 (getHeight)");
      } else {
        i++;
        next();
      }
    })
  }, function (err) {
    return cb(err);
  });
}

// Used to randomize selecting from within an array. Requires array length
function randomizeSelection(length) {
  return Math.floor(Math.random() * length);
}

// Returns a random number between min (inclusive) and max (exclusive)
function randomNumber(min, max) {
  return  Math.floor(Math.random() * (max - min) + min);
}

// Calculates the expected fee from a transaction
function expectedFee(amount) {
  return parseInt(Fees.transactionFee);
}

// Used to create random usernames
function randomUsername() {
  var size = randomNumber(1,16); // Min. username size is 1, Max. username size is 16
  var username = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.";

  for( var i=0; i < size; i++ )
    username += possible.charAt(Math.floor(Math.random() * possible.length));

  return username;
}

function randomCapitalUsername() {
  var size = randomNumber(1,16); // Min. username size is 1, Max. username size is 16
  var username = "A";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&_.";

  for( var i=0; i < size-1; i++ )
    username += possible.charAt(Math.floor(Math.random() * possible.length));

  return username;
}

// Used to create random basic accounts
function randomAccount() {
  var account = {
    "address" : "",
    "publicKey" : "",
    "password" : "",
    "secondPassword": "",
    "delegateName" : "",
    "balance": 0
  };

  account.password = randomPassword();
  account.secondPassword = randomPassword();
  account.delegateName = randomDelegateName();

  return account;
}

// Used to create random transaction accounts (holds additional info to regular account)
function randomTxAccount() {
  return _.defaults(randomAccount(), {
    sentAmount:"",
    paidFee: "",
    totalPaidFee: "",
    transactions: []
  })
}

// Used to create random passwords
function randomPassword() {
  return Math.random().toString(36).substring(7);
}

// Exports variables and functions for access from other files
module.exports = {
  api: api,
  chai: chai,
  peer : peer,
  lisk : require("./lisk-js"),
  supertest: supertest,
  expect: expect,
  version: version,
  LISK: LISK,
  Gaccount: Gaccount,
  Daccount: Daccount,
  Eaccount: Eaccount,
  TxTypes: TxTypes,
  DappType: DappType,
  DappCategory: DappCategory,
  guestbookDapp: guestbookDapp,
  Fees: Fees,
  normalizer: normalizer,
  blockTime: blockTime,
  blockTimePlus: blockTimePlus,
  randomProperty: randomProperty,
  randomDelegateName: randomDelegateName,
  randomLISK: randomLISK,
  randomPassword: randomPassword,
  randomAccount: randomAccount,
  randomTxAccount: randomTxAccount,
  randomUsername: randomUsername,
  randomNumber: randomNumber,
  randomCapitalUsername: randomCapitalUsername,
  expectedFee:expectedFee,
  addPeers:addPeers,
  peers_config: config.mocha.peers,
  config: config,
  waitForNewBlock: waitForNewBlock,
  getHeight: getHeight,
  onNewBlock: onNewBlock
};
