# @liskhq/lisk-p2p

@liskhq/lisk-p2p is containing unstructured P2P library for creating and running unstructured P2P networks. The aim of this library is to make it easier for developers to create P2P projects without thinking about security, discovery, selection and eviction mechanisms and concentrate more on developing use cases and P2P projects on top of it. A developer can leverage underlying robust security, discovery and selections mechanisms and use the easy to use interface to use the library. This library implements features proposed in [LIP: 0004: Introduce robust peer selection and banning mechanism](https://github.com/LiskHQ/lips/blob/master/proposals/lip-0004.md).

## Installation

```sh
$ npm install --save @liskhq/lisk-p2p
```

To run a P2P node.

```typescript
const { P2P } = require('@liskhq/lisk-p2p');

const p2p = new P2P({
	nodeInfo: {
		wsPort: 5001,
		nethash: '123xyz', // network identifier
		protocolVersion: '1.1',
	},
});

const run = async () => {
	await p2p.start();
};

run()
	.then(() => console.log('P2P node has started!'))
	.catch(err => {
		console.log(`Error occurred while running p2p node: ${err}`);
		p2p.stop();
		process.exit(1);
	});
```

It will start a node that is available on `5001` websocket port.

```shell
P2P node has started!
```

### Connect to Lisk Testnet network

```typescript
const { P2P } = require('@liskhq/lisk-p2p');

const p2p = new P2P({
	nodeInfo: {
		wsPort: 5001,
	},
});

const run = async () => {
	await p2p.start();
};

run()
	.then(() => console.log('P2P node has started!'))
	.catch(err => {
		console.log(`Error occurred while running p2p node: ${err}`);
		p2p.stop();
		process.exit(1);
	});
```

### Actions

It provides simple interface to send, request, broadcast information and many more functions to interact with the network.

- `p2p.start()` to start a P2P node after creating an instance.
- `p2p.stop()` to stop a P2P node.
- `p2p.config` to get the config of the node.
- `p2p.isActive` to check the status if the node is up and running.
- `p2p.nodeInfo` to check the node status and information.
- `applyNodeInfo(nodeInfo: P2PNodeInfo)` to broadcast your updated `nodeInfo` to the network.
- `p2p.getConnectedPeers()` to get all the connected peers that are connected to your node in the network.
- `p2p.getDisconnectedPeers` to get all the disconnected peers that are part of the network but not connected to you.
- `p2p.request(packet: P2PRequestPacket)` to request information from the network that will run the peer selection and finds an appropriate peer for you to request information.
- `p2p.send(message: P2PMessagePacket)` it will send the information to 16 connected peers choosen by peer selection for send.
- `broadcast(message: P2PMessagePacket)` to broadcast information to all the connected peers.
- `requestFromPeer(packet: P2PRequestPacket,peerId: string)` to request from a specific peers in the network.
- `sendToPeer(message: P2PMessagePacket, peerId: string)` to send information to a specific peer in the connected peers.

### Events

We can listen to various events on the network to observe the network activities more closely and take appropriate actions if needed.

```typescript
p2p.on(EVENT_CONNECT_OUTBOUND, peerInfo => {
	// Take any action based on outbound connect event
});
```

#### Available events

- `EVENT_BAN_PEER` - When a peer is banned
- `EVENT_CLOSE_INBOUND`
- `EVENT_CLOSE_OUTBOUND`
- `EVENT_CONNECT_ABORT_OUTBOUND`
- `EVENT_CONNECT_OUTBOUND`
- `EVENT_DISCOVERED_PEER`
- `EVENT_FAILED_PEER_INFO_UPDATE`
- `EVENT_FAILED_TO_ADD_INBOUND_PEER`
- `EVENT_FAILED_TO_COLLECT_PEER_DETAILS_ON_CONNECT`
- `EVENT_FAILED_TO_FETCH_PEER_INFO`
- `EVENT_FAILED_TO_FETCH_PEERS`
- `EVENT_FAILED_TO_PUSH_NODE_INFO`
- `EVENT_FAILED_TO_SEND_MESSAGE`
- `EVENT_INBOUND_SOCKET_ERROR`
- `EVENT_MESSAGE_RECEIVED`
- `EVENT_NETWORK_READY`
- `EVENT_NEW_INBOUND_PEER`
- `EVENT_OUTBOUND_SOCKET_ERROR`
- `EVENT_REMOVE_PEER`
- `EVENT_REQUEST_RECEIVED`
- `EVENT_UNBAN_PEER`
- `EVENT_UPDATED_PEER_INFO`

### Examples

Check it under `lisk-p2p/examples` folder for a few examples to demonstrate P2P library usage and some use cases.

## License

Copyright 2016-2019 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

---

Copyright © 2016-2019 Lisk Foundation

Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[lisk core github]: https://github.com/LiskHQ/lisk
[lisk documentation site]: https://lisk.io/documentation/lisk-elements
