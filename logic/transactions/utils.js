'use strict';

var BSON = require('bson');

var bson = new BSON();

exports.pack = pack;
exports.unpack = unpack;

function pack (data) {
  return bson.serialize(data);
}

function unpack (data) {
  return bson.deserialize(data);
}

 