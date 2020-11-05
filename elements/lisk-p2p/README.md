# @liskhq/lisk-p2p

@liskhq/lisk-p2p is a library for creating unstructured P2P networks. The library in abstraction enables peer discovery, network security, and reliability. A developer can leverage all the underlying specifications proposed in [LIP: 0004: Introduce robust peer selection and banning mechanism](https://github.com/LiskHQ/lips/blob/master/proposals/lip-0004.md) and use the library for building p2p use cases.

## Installation

```sh
$ npm install --save @liskhq/lisk-p2p
```

To run a P2P node.

```typescript
const { P2P } = require('@liskhq/lisk-p2p');

const p2p = new P2P({
	nodeInfo: {
		port: 5001,
		networkId: '123xyz',
		networkVersion: '1.1',
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

### Actions

It provides simple interface to send, request, broadcast information and many more functions to interact with the network.

- `p2p.start()`: start a P2P node after creating an instance.
- `p2p.stop()`: stop a P2P node.
- `p2p.config`: get the config of the node.
- `p2p.isActive`: check the status if the node is up and running.
- `p2p.nodeInfo`: check the node status and information.
- `applyNodeInfo(nodeInfo: P2PNodeInfo)`: broadcast updated `nodeInfo` to the network.
- `p2p.getConnectedPeers()`: get all the connected peers that are connected to your node in the network.
- `p2p.getDisconnectedPeers()`: get all the disconnected peers that are part of the network but not connected to you.
- `p2p.request(packet: P2PRequestPacket)`: request information from the network that will run the peer selection and finds an appropriate peer for you to request information.
- `p2p.send(message: P2PMessagePacket)`: sends information to 16 connected peers chosen by peer selection for send.
- `p2p.broadcast(message: P2PMessagePacket)`: broadcast information to all the connected peers.
- `p2p.requestFromPeer(packet: P2PRequestPacket,peerId: string)`: request from a specific peers in the network.
- `p2p.sendToPeer(message: P2PMessagePacket, peerId: string)`: sends information to a specific peer in the connected peers.

### Events

Listen to various events on the network to observe the network activities more closely and take appropriate actions if needed.

```typescript
// When a peer updates its information
p2p.on(EVENT_UPDATED_PEER_INFO, (peerInfo: P2PPeerInfo) => {
	// Take any action based peer update event
});
// When a peer sends any information
p2p.on(EVENT_MESSAGE_RECEIVED, (message: P2PMessagePacket) => {
	// Take any action based on message received
	const { event, data, peerId } = message;
});
// When a peer requests any information
p2p.on(EVENT_REQUEST_RECEIVED, async (request: P2PRequest) => {
	// Take any action based on request received and respond with `end(results)` with results or return an error by `error(new Error('Request was not processed successfully'))`
	const { procedure, data, peerId, end, error } = request;
});
```

#### Available events

- `EVENT_BAN_PEER`
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
- `EVENT_UPDATED_PEER_INFO`

### Examples

Check [examples](examples/) folder for a few examples to demonstrate P2P library usage with some use cases. Please make sure you run `npm run build` before running any example.

- [echo](examples/echo): This example will run nodes that will connect to each other and say "`hi`" to each other that will be responded by peers when they receive the message. The network will shut down on its own after reaching 10 greetings. Run `node examples/echo`.
- [find-city-game](examples/find-city-game): Each node will assign themselves a city and change their city randomly and they will update other nodes which city they are currently in. If any two nodes find out that they are in the same city they will broadcast it to others and shutdown. Run `node examples/find-city-game`.
- [Connect to Lisk networks](examples/lisk-networks): Example to create a lightweight p2p client that can connect to the lisk network, listen to various events and request data from the network. Run `node examples/lisk-network {NETWORK_NAME}` where `NETWORK_NAME` can be testnet, devnet and mainnet.

## License

Copyright 2016-2020 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

[lisk core github]: https://github.com/LiskHQ/lisk
[lisk documentation site]: https://lisk.io/documentation/lisk-elements
