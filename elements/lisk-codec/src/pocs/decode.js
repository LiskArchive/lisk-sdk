/*
 * Copyright © 2020 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */


 /*
	THIS IS ONE POSSIBLE APPROACH FOR DECODING LISK BINARY MESSAGES. IT'S NOT RECURSIVE BUT IT SHOWS PART OF THE LOGIC
	OF WALKING THE BUFFER AND BY THE FACT THAT BINARY MESSAGES ARE KEY/VALUE PAIRS SOME ASSUMPTIONS CAN BE MADE
	LIKE ALL MESSAGES START WITH A VARINT ENCODED KEY FOLLWOED BY A SIZE IF WIRE TYPE IS 2 OR BY A VARINT IF WIRE TYPE IS 0
	FOR WIRE TYPE 0 THE SIZE IS ENCOEDED EITHER IN THE VARINT OR IF IT'S BOOLEAN IT'S VARINT.
 */

const varint = require('varint');

const binaryMsgHexString = '0a14e11a11364738225813f86ea85214400e5db08d6e100a1a200fd3c50a6d3bd17ea806c0566cf6cf10f6e3697d9bda1820b00cb14746bcccef20052a4608021220c8b8fbe474a2b63ccb9744a409569b0a465ee1803f80435aec1c5e7fc2d4ee1812206115424fec0ce9c3bac5a81b5c782827d1f956fb95f1ccfa36c566d04e4d72673299010a180a07436174756c6c6f1201551820204028003080c6868f0112270a20cd32c73e9851c7137980063b8af64aa5a31651f8dcad258b682d2ddf091029e41080c2d72f12270a209d86ad24a3f030e5522b6598115bb4d70c1692c9d8995ddfccb377379a2d86c61080e59a771a2b0a20655e665765e3c42712d9a425b5b720d10457a5e45de0d4420e7c53ad73b02ef5108088debe01188001';

const msgBuffer = Buffer.from(binaryMsgHexString, 'hex');

console.log(msgBuffer)
console.log();

const sortedOptimizedSchema = [
  { fieldNumber: 1, name: 'address', type: 'bytes'},
  { fieldNumber: 2, name: 'balance', type: 'uint64'},
  { fieldNumber: 3, name: 'publicKey', type: 'bytes'},
  { fieldNumber: 4, name: 'nonce', type: 'uint64'},
  { fieldNumber: 5, name: 'keys', type: 'object'},
  { fieldNumber: 6, name: 'asset', type: 'object'},
]

const WIRE_TYPE_TWO = 2; // Strings, bytes.....
const WIRE_TYPE_ZERO = 0; // the rest that is not 2

const keepReading = byte => (byte & 128) === 128 ? true : false;

const getFieldNumber = bytes => varint.decode(bytes) >>> 3;

const getWireType = byte => (byte & WIRE_TYPE_TWO) === WIRE_TYPE_TWO ? 2 : 0;

const getChunk = (buffer, startPosition) => {
  let i = startPosition;
  const bytesToDecode = [];

  while(keepReading(buffer[i])){
    bytesToDecode.push(buffer[i]);
    i++;
  }
  // If the encoded varint is 1 byte we need to push it as it would not have entered the loop
  bytesToDecode.push(buffer[i]);
  i++;
  return { value: bytesToDecode, bytesRead: i - startPosition, };
};

const readers = {
  bytes: (buffer, start, end, object) => {
    console.log(`Decoding bytes from buffer from "${start}" to "${end}"`);
    console.log(buffer.slice(start, start+end)); // buf.slice() uses indexes not length!
    return buffer.slice(start, start+end);
  }
}


const decode = (buffer, object = {}) => {
  console.time('decoding');

  for(let bufferIndex=0; bufferIndex < buffer.length; bufferIndex++) {
    // Read key
    const key = getChunk(buffer, bufferIndex);
    const fieldNumber = getFieldNumber(key.value);
    const wireType = getWireType(key.value)
    bufferIndex = bufferIndex + key.bytesRead;

    // Based on key figure out how to read following bytes
    if(wireType === 2) {
      console.log('wire type is string/bytes need to read lenght');
      const byteSize = getChunk(buffer, bufferIndex); // In next byte(s) we have the size of string/bytes that follow
      const byteSizeAsNumber = varint.decode(byteSize.value);
      bufferIndex = bufferIndex + byteSize.bytesRead;
      console.log('byteSize', byteSize, byteSizeAsNumber);
      const byteContent = readers['bytes'](buffer, bufferIndex, byteSizeAsNumber, object); // 'bytes' should come from schema
      // Move the loop counter so it starts on next key after reaging a binary key/value pair
      bufferIndex = bufferIndex + byteSizeAsNumber - 1;
      console.log();

      // Write reesult to object
      object[sortedOptimizedSchema[fieldNumber-1].name] = byteContent.toString('hex');

      continue;
    }

    if(wireType === 0) {
      console.log('WE HAVE A NUMBER');
      // We have read the key so move the pointer forward
      // Decode number
      const res = getChunk(buffer, bufferIndex);

      bufferIndex = bufferIndex + res.bytesRead - 1;
      object[sortedOptimizedSchema[fieldNumber-1].name] = varint.decode(res.value);
      console.log();
      continue;
    }
    //console.log('bufferIndex:', bufferIndex);

  }
  console.timeEnd('decoding');
}



const obj = {};
decode(msgBuffer, obj);

console.log(obj);
