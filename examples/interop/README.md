### Description

This folder contains example applications for mainchain and sidechain with POS consensus algorithm.

- pos-mainchain-fast

Genesis Configuration:

```js
blockTime: 5;
bftBatchSize: 5;
chainID: 04000000;
```

Below configuration added for Chain Connector Plugin in `config/default/config.json`

```json
"plugins": {
		"chainConnector": {
            "receivingChainID": "04000001",
            "encryptedPrivateKey": "kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=47f00a1502fb1b4fe4db2427a805636e7b3d82be7b8b8c5aa8e0325fbe777dba8bea9daa1ef3d6b81784866229277fb2935dbd977ad40f3451081c1ef3fbc03ee044779241d99257bdcce2bd646cc7c9ceeb1952de88baf5fa7fe597cf20744ed8cdbbbc16fa3ff9a712272b61882d7fb7ed9b267ea1a12970352ba8a8dcded5&mac=f7a7a7b6c2c47e2305f4dc5019a0511b9645ef6c68a5b1f7de324ca995c1c869&salt=6483dd1e9c6b00f0b9e8968b0f852bd6&iv=eb182b56fc868be3ac2a5de6&tag=0f8572a9a25b6d344ee50f53e7af9a11&iterations=1&parallelism=4&memorySize=2024",
            "password": "lisk",
            "ccuFee": "1000000000",
            "receivingChainIPCPath": "~/.lisk/pos-sidechain-fast"
	    }
	}
```

- pos-sidechain-fast

Genesis Configuration:

```js
blockTime: 5;
bftBatchSize: 5;
chainID: 04000001;
```

Below configuration added for Chain Connector Plugin in `config/default/config.json`

```json
"plugins": {
		"chainConnector": {
			"receivingChainID": "04000000",
			"encryptedPrivateKey": "kdf=argon2id&cipher=aes-256-gcm&version=1&ciphertext=ab4354c56527e236f4a4b1abed94519b2db8f2f5568f995f679466f597a7a0f4a124358a19a84b84328c8a6e8cc0c96f2234bbc279f9554723e4c21d73aa03ad0ca010110b76ca0680c3f43d2b66c574eb03ed306b8944d40db706a06a14931723ac1df7d613fe654d941c7c25e64cd9e8727e13314346b3bb519c9839338d9e&mac=9348ac2fcc1bc870cacef541cb00838e4f70b8c61239721286cb9a5d67c627c8&salt=ead34f6a3ae8f821396881e033dde523&iv=364dddf45dd0fee2f5971ae2&tag=d347e6e4b057e3bd5692904c595fd5a2&iterations=1&parallelism=4&memorySize=2024",
			"password": "lisk",
			"ccuFee": "1000000000",
			"receivingChainIPCPath": "~/.lisk/pos-mainchain-fast"
		}
	}
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

Run below commands to start mainchain and sidechain applications

- `pm2 interop/pos-mainchain-fast/src/pm2.json`
- `pm2 interop/pos-sidechain-fast/src/pm2.json`

Interact with applications using `pm2`

- `pm2 ls` to list all the applications with their status
- `pm2 logs 0` or `pm2 logs mainchain-pos` to see the logs of individual apps.
- `pm2 start 0` or `pm2 start mainchain-pos` to start an application
- `pm2 stop 0` or `pm2 stop mainchain-pos` to stop an application
- `pm2 start all` to start all the applications
- `pm2 stop all` to stop all the applications

#### Register chains

- Run `ts-node /pos-mainchain-fast/config/scripts/sidechain_registration.ts` to register sidechain on mainchain node
- Run `ts-node /pos-sidechain-fast/config/scripts/mainchain_registration.ts`
  to register mainchain on sidechain node

Check chain status

- Run `./bin/run endpoint:invoke 'interoperability_getChainAccount' '{"chainID": "04000000" }'` to check chain status of mainchain account on sidechain. It should show lastCertificate with height 0 and status 0.
- Run `./bin/run endpoint:invoke 'interoperability_getChainAccount' '{"chainID": "04000001" }'` to check chain status of sidechain account on mainchain. It should show lastCertificate with height 0 and status 0.

Now observe logs, intially it will log `No valid CCU can be generated for the height: ${newBlockHeader.height}` until first finalized height is reached.

When the finalized height is reached, check chain status as described above and it should update lastCertificate height > 0 and status to 1 which means the CCU was sent successfully and chain is active now.
