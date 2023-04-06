### Description

This folder contains example applications for mainchain and sidechain with POS consensus algorithm.

- pos-mainchain-fast

Genesis Configuration:

```js
blockTime: 5;
bftBatchSize: 5;
chainID: 04000000;
```

### How to run?

#### Setup

Install and build `pos-mainchain-fast`

- `cd pos-mainchain-fast`
- `yarn && yarn build`

Install and build `pos-sidechain-fast`

- `cd pos-sidechain-fast`
- `yarn && yarn build`

#### Run apps using pm2

Install [pm2](https://pm2.keymetrics.io/) if not installed using `npm install pm2 -g`

Run mainchain nodes

- `cd pos-mainchain-fast`
- `pm2 start config/mainchain_node_one.sh`
- `pm2 start config/mainchain_node_two.sh`

Run below commands to start sidechain applications

- Come back to interop folder after above step `cd ..`
- Run `pm2 start run_sidechains.json`

Above steps will run 2 mainchain nodes of the same network with chainID `04000000` and 1 sidechain node of each network (2 nodes in total for sidechains) with chainID `04000001` and `04000002` respectively.

Interact with applications using `pm2`

- `pm2 ls` to list all the applications with their status
- `pm2 logs 0` or `pm2 logs mainchain_node_one` to see the logs of individual apps.
- `pm2 start 0` or `pm2 start mainchain_node_one` to start an application
- `pm2 stop 0` or `pm2 stop mainchain_node_one` to stop an application
- `pm2 start all` to start all the applications
- `pm2 stop all` to stop all the applications

#### Register chains

- Run `ts-node pos-mainchain-fast/config/scripts/sidechain_registration.ts` to register all the sidechains on the mainchain node.
- Run `ts-node pos-sidechain-example-one/config/scripts/mainchain_registration.ts` to register sidechain `sidechain_example_one` on mainchain.
- Run `ts-node pos-sidechain-example-two/config/scripts/mainchain_registration.ts` to register sidechain `sidechain_example_two` on mainchain.

Check chain status

- Run `./bin/run endpoint:invoke 'interoperability_getChainAccount' '{"chainID": "04000000" }'` to check chain status of mainchain account on sidechain. It should show lastCertificate with height 0 and status 0 if no CCU was sent yet.
- Run `./bin/run endpoint:invoke 'interoperability_getChainAccount' '{"chainID": "04000001" }'` to check chain status of sidechain account on mainchain. It should show lastCertificate with height 0 and status 0 if no CCU was sent yet.

Now observe logs, intially it will log `No valid CCU can be generated for the height: ${newBlockHeader.height}` until first finalized height is reached.

When the finalized height is reached, check chain status as described above and it should update lastCertificate height > 0 and status to 1 which means the CCU was sent successfully and chain is active now.
