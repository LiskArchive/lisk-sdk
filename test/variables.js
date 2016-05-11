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
    "account": "",
    "address": "",
    "publicKey": ""
  }
}

var normalizer = 100000000; // Use this to convert LISK amount to normal value
var blockTime = 10000; // Block time in miliseconds
var blockTimePlus = 12000; // Block time + 2 seconds in miliseconds
var version = "0.2.1" // Node version

// Holds Fee amounts for different transaction types
var Fees = {
  voteFee: 100000000,
  transactionFee: 10000000,
  secondPasswordFee: 500000000,
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
  "address": "4180149793392527131L",
  "publicKey": "fe16b09612ca50a6cbcc0a95bdf30bfa11e12c1aded819916cadb0c1e769b4bf",
  "password": "demise hidden width hand solid deal doll party danger pencil foil oven",
  "secondPassword": "brother maid replace hard scorpion clinic sentence bridge goose gun mass next",
  "balance": 0,
  "delegateName": "ManualDelegate",
};

// Existing delegate account in blockchain
var Eaccount = {
  "address": "16109618324961077899L",
  "publicKey": "53ccfe3f10e135781db6346ce726c0f0e050775e3e6438395da0f81bed14dde4",
  "password": "length reunion two motor spy shine copper elite culture lift pet organ",
  "balance": 0,
  "delegateName": "genesisDelegate100"
};

// List of all transaction types codes
var TxTypes = {
  SEND: 0,
  SIGNATURE: 1,
  DELEGATE: 2,
  VOTE: 3,
  MULTI: 4,
  DAPP: 5,
  IN_TRANSFER: 6,
  OUT_TRANSFER: 7
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
  "address": "16313739661670634666L",
  "publicKey": "c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f",
  "password": "wagon stock borrow episode laundry kitten salute link globe zero feed marble",
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
    //console.log("Height: " + height);
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
    "username" : "",
    "balance": 0
  };

  account.password = randomPassword();
  account.secondPassword = randomPassword();
  account.username = randomDelegateName();

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
  config: config,
  waitForNewBlock: waitForNewBlock,
  getHeight: getHeight,
  onNewBlock: onNewBlock
};
