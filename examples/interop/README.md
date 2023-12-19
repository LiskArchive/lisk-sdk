### Description

This folder contains example applications for mainchain and sidechain with POS consensus algorithm.

Genesis Configuration:

- pos-mainchain-fast

```js
blockTime: 5;
bftBatchSize: 5;
chainID: '04000000';
name: 'lisk_mainchain';
```

- pos-sidechain-example-one

```js
blockTime: 5;
bftBatchSize: 5;
chainID: '04000001';
name: 'sidechain_example_one';
```

- pos-sidechain-example-two

```js
blockTime: 5;
bftBatchSize: 5;
chainID: '04000002';
name: 'sidechain_example_two';
```

### How to run?

#### Setup

Install and build `pos-mainchain-fast`

- `cd pos-mainchain-fast`
- `yarn && yarn build`

Install and build `pos-sidechain-example-one`

- `cd pos-sidechain-example-one`
- `yarn && yarn build`

Install and build `pos-sidechain-example-two`

- `cd pos-sidechain-example-two`
- `yarn && yarn build`

#### Run apps using pm2

- Install [pm2](https://pm2.keymetrics.io/) if not installed using `npm install pm2 -g`
- Install [`ts-node`](https://www.npmjs.com/package/ts-node) globally

Run 2 instances mainchain node

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
- Run `ts-node pos-sidechain-example-one/config/scripts/mainchain_registration.ts` to register mainchain on sidechain `sidechain_example_one`.
- Run `ts-node pos-sidechain-example-two/config/scripts/mainchain_registration.ts` to register mainchain on sidechain `sidechain_example_two`.

#### Check chain status

- Run `./pos-sidechain-example-one/bin/run endpoint:invoke interoperability_getChainAccount '{"chainID": "04000000" }'` to check chain status of the mainchain account on the sidechain one. It should show lastCertificate with height 0 and status 0 if no CCU was sent yet.
- Run `./pos-mainchain-fast/bin/run endpoint:invoke interoperability_getChainAccount '{"chainID": "04000001" }' --data-path ~/.lisk/mainchain-node-one` to check chain status of the sidechain one account on the mainchain, using mainchain node one. It should show lastCertificate with height 0 and status 0 if no CCU was sent yet.

Now observe logs, initially it will log `No valid CCU can be generated for the height: ${newBlockHeader.height}` until first finalized height is reached.

When the finalized height is reached, check chain status as described above and it should update lastCertificate `height > 0` and status to `1` which means the CCU was sent successfully and chain is active now.

### Authorize ChainConnector plugin to sign and send CCU (Cross-Chain Update) transactions

Authorize ChainConnector plugin on each of the 4 nodes:

```
./pos-mainchain-fast/bin/run endpoint:invoke chainConnector_authorize '{"enable": true, "password": "lisk" }' --data-path ~/.lisk/mainchain-node-one

./pos-mainchain-fast/bin/run endpoint:invoke chainConnector_authorize '{"enable": true, "password": "lisk" }' --data-path ~/.lisk/mainchain-node-two

./pos-sidechain-example-one/bin/run endpoint:invoke chainConnector_authorize '{"enable": true, "password": "lisk" }'

./pos-sidechain-example-two/bin/run endpoint:invoke chainConnector_authorize '{"enable": true, "password": "lisk" }'
```

#### Cross Chain transfers

##### Transfer from mainchain to sidechain one

- Run `ts-node pos-mainchain-fast/config/scripts/transfer_lsk_sidechain_one.ts` from `interop` folder.
- Check balance for `lskxz85sur2yo22dmcxybe39uvh2fg7s2ezxq4ny9` using `token_getBalances` RPC on sidechain one.

##### Transfer from mainchain to sidechain two

- Run `ts-node pos-mainchain-fast/config/scripts/transfer_lsk_sidechain_two.ts` from `interop` folder.
- Check balance for `lskx5uqu2zzybdwrqswd8c6b5v5aj77yytn4k6mv6` using `token_getBalances` RPC on sidechain two.

##### Transfer sidechain one to mainchain

- Run `ts-node pos-sidechain-example-one/config/scripts/transfer_lsk_mainchain.ts` from `interop` folder.
- Check balance for `lskzjzeam6szx4a65sxgavr98m9h4kctcx85nvy7h` using `token_getBalances` RPC on mainchain.

##### Transfer sidechain two to sidechain one

- Run `ts-node pos-sidechain-example-two/config/scripts/transfer_sidechain_one.ts` from `interop` folder.
- Check balance for `lskxvesvwgxpdnhp4rdukmsx42teehpxkeod7xv7f` using `token_getBalances` RPC on sidechain one.

##### Transfer sidechain one to sidechain two

- Run `ts-node pos-sidechain-example-one/config/scripts/transfer_sidechain_two.ts` from `interop` folder.
- Check balance for `lskx5uqu2zzybdwrqswd8c6b5v5aj77yytn4k6mv6` using `token_getBalances` RPC on sidechain one.

### Helper Scripts

#### start_example

- It build 4 chains, starts with pm2, and register chains
- If you want to restart everything from scratch, run `./start_example --reset`

#### monitor

- Calls 4 chain's getAllChainAccounts at the same time, at 5s interval

#### Other options

There are `genesis_assets_103_validators.json` file under config folder of each app. You can also use this
genesis-assets if you want to run an application for 103 validators. In order to do so follow these steps:

- Update genesis block using
  command: `./bin/run genesis-block:create --output config/default/ --assets-file config/default/genesis_assets_103_validators.json`

## Learn More

[Here](https://github.com/LiskHQ/lisk-docs/blob/7a7c1606c688f8cd91b50d0ddc199907c6b4f759/docs/modules/ROOT/images/build-blockchain/interop-example.png) is a reference to the diagram explaining interop setup nicely.
