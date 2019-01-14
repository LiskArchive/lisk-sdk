# `lisk transaction`

Commands relating to Lisk transactions.

* [`lisk transaction:broadcast [TRANSACTION]`](#lisk-transaction-broadcast-transaction)
* [`lisk transaction:create`](#lisk-transaction-create)
* [`lisk transaction:create:transfer AMOUNT ADDRESS`](#lisk-transaction-create-transfer-amount-address)
* [`lisk transaction:create:second-passphrase`](#lisk-transaction-create-second-passphrase)
* [`lisk transaction:create:delegate USERNAME`](#lisk-transaction-create-delegate-username)
* [`lisk transaction:create:vote`](#lisk-transaction-create-vote)
* [`lisk transaction:create:multisignature LIFETIME MINIMUM KEYSGROUP`](#lisk-transaction-create-multisignature-lifetime-minimum-keysgroup)
* [`lisk transaction:get IDS`](#lisk-transaction-get-ids)
* [`lisk transaction:sign [TRANSACTION]`](#lisk-transaction-sign-transaction)
* [`lisk transaction:verify [TRANSACTION]`](#lisk-transaction-verify-transaction)

## `lisk transaction:broadcast [TRANSACTION]`

Broadcasts a transaction to the network via the node specified in the current config.

```
USAGE
  $ lisk transaction:broadcast [TRANSACTION]

ARGUMENTS
  TRANSACTION  Transaction to broadcast in JSON format.

OPTIONS
  -j, --[no-]json  Prints output in JSON format. You can change the default behaviour in your config.json file.

  --[no-]pretty    Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You
                   can change the default behaviour in your config.json file.

DESCRIPTION
  Broadcasts a transaction to the network via the node specified in the current config.
  Accepts a stringified JSON transaction as an argument, or a transaction can be piped from a previous command.
  If piping make sure to quote out the entire command chain to avoid piping-related conflicts in your shell.

EXAMPLES
  broadcast transaction '{"type":0,"amount":"100",...}'
  echo '{"type":0,"amount":"100",...}' | lisk transaction:broadcast
```

## `lisk transaction:create`

Creates a transaction object.

```
USAGE
  $ lisk transaction:create

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -p, --passphrase=passphrase
      Specifies a source for your secret passphrase. Lisk Commander will prompt you for input if this option is not set.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --passphrase=prompt (default behaviour)
      	- --passphrase='pass:my secret passphrase' (should only be used where security is not important)
      	- --passphrase=env:SECRET_PASSPHRASE
      	- --passphrase=file:/path/to/my/passphrase.txt (takes the first line only)
      	- --passphrase=stdin (takes one line only)

  -s, --second-passphrase=second-passphrase
      Specifies a source for your second secret passphrase. For certain commands a second passphrase is necessary, in
      which case Lisk Commander will prompt you for it if this option is not set. Otherwise, Lisk Commander will assume
      you want to use one passphrase only.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --second-passphrase=prompt (to force a prompt even when a second passphrase is not always necessary)
      	- --second-passphrase='pass:my second secret passphrase' (should only be used where security is not important)
      	- --second-passphrase=env:SECOND_SECRET_PASSPHRASE
      	- --second-passphrase=file:/path/to/my/secondPassphrase.txt (takes the first line only)
      	- --second-passphrase=stdin (takes one line only)

  -t, --type=0|transfer|1|second-passphrase|2|delegate|3|vote|4|multisignature
      (required) type of transaction to create

  --no-signature
      Creates the transaction without a signature. Your passphrase will therefore not be required.

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

  --unvotes=unvotes
      Specifies the public keys for the delegate candidates you want to remove your vote from. Takes either a string of
      public keys separated by commas, or a path to a file which contains the public keys.
      	Examples:
      	- --unvotes=publickey1,publickey2
      	- --unvotes=file:/path/to/my/unvotes.txt (every public key should be on a new line)

  --votes=votes
      Specifies the public keys for the delegate candidates you want to vote for. Takes either a string of public keys
      separated by commas, or a path to a file which contains the public keys.
      	Examples:
      	- --votes=publickey1,publickey2
      	- --votes=file:/path/to/my/votes.txt (every public key should be on a new line)

DESCRIPTION
  Creates a transaction object.

EXAMPLES
  transaction:create --type=0 100 13356260975429434553L
  transaction:create --type=delegate lightcurve
```

## `lisk transaction:create:transfer AMOUNT ADDRESS`

Creates a transaction which will transfer the specified amount to an address if broadcast to the network.

```
USAGE
  $ lisk transaction:create:transfer AMOUNT ADDRESS

ARGUMENTS
  AMOUNT   Amount of LSK to send.
  ADDRESS  Address of the recipient.

OPTIONS
  -d, --data=data
      Optional UTF8 encoded data (maximum of 64 bytes) to include in the transaction asset.
      	Examples:
      	- --data=customInformation

  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -p, --passphrase=passphrase
      Specifies a source for your secret passphrase. Lisk Commander will prompt you for input if this option is not set.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --passphrase=prompt (default behaviour)
      	- --passphrase='pass:my secret passphrase' (should only be used where security is not important)
      	- --passphrase=env:SECRET_PASSPHRASE
      	- --passphrase=file:/path/to/my/passphrase.txt (takes the first line only)
      	- --passphrase=stdin (takes one line only)

  -s, --second-passphrase=second-passphrase
      Specifies a source for your second secret passphrase. For certain commands a second passphrase is necessary, in
      which case Lisk Commander will prompt you for it if this option is not set. Otherwise, Lisk Commander will assume
      you want to use one passphrase only.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --second-passphrase=prompt (to force a prompt even when a second passphrase is not always necessary)
      	- --second-passphrase='pass:my second secret passphrase' (should only be used where security is not important)
      	- --second-passphrase=env:SECOND_SECRET_PASSPHRASE
      	- --second-passphrase=file:/path/to/my/secondPassphrase.txt (takes the first line only)
      	- --second-passphrase=stdin (takes one line only)

  --no-signature
      Creates the transaction without a signature. Your passphrase will therefore not be required.

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Creates a transaction which will transfer the specified amount to an address if broadcast to the network.

EXAMPLE
  transaction:create:transfer 100 13356260975429434553L
```

## `lisk transaction:create:second-passphrase`

Creates a transaction which will register a second passphrase for the account if broadcast to the network.

```
USAGE
  $ lisk transaction:create:second-passphrase

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -p, --passphrase=passphrase
      Specifies a source for your secret passphrase. Lisk Commander will prompt you for input if this option is not set.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --passphrase=prompt (default behaviour)
      	- --passphrase='pass:my secret passphrase' (should only be used where security is not important)
      	- --passphrase=env:SECRET_PASSPHRASE
      	- --passphrase=file:/path/to/my/passphrase.txt (takes the first line only)
      	- --passphrase=stdin (takes one line only)

  -s, --second-passphrase=second-passphrase
      Specifies a source for your second secret passphrase. For certain commands a second passphrase is necessary, in
      which case Lisk Commander will prompt you for it if this option is not set. Otherwise, Lisk Commander will assume
      you want to use one passphrase only.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --second-passphrase=prompt (to force a prompt even when a second passphrase is not always necessary)
      	- --second-passphrase='pass:my second secret passphrase' (should only be used where security is not important)
      	- --second-passphrase=env:SECOND_SECRET_PASSPHRASE
      	- --second-passphrase=file:/path/to/my/secondPassphrase.txt (takes the first line only)
      	- --second-passphrase=stdin (takes one line only)

  --no-signature
      Creates the transaction without a signature. Your passphrase will therefore not be required.

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Creates a transaction which will register a second passphrase for the account if broadcast to the network.

EXAMPLE
  transaction:create:second-passphrase
```

## `lisk transaction:create:delegate USERNAME`

Creates a transaction which will register the account as a delegate candidate if broadcast to the network.

```
USAGE
  $ lisk transaction:create:delegate USERNAME

ARGUMENTS
  USERNAME  Username to register as a delegate.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -p, --passphrase=passphrase
      Specifies a source for your secret passphrase. Lisk Commander will prompt you for input if this option is not set.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --passphrase=prompt (default behaviour)
      	- --passphrase='pass:my secret passphrase' (should only be used where security is not important)
      	- --passphrase=env:SECRET_PASSPHRASE
      	- --passphrase=file:/path/to/my/passphrase.txt (takes the first line only)
      	- --passphrase=stdin (takes one line only)

  -s, --second-passphrase=second-passphrase
      Specifies a source for your second secret passphrase. For certain commands a second passphrase is necessary, in
      which case Lisk Commander will prompt you for it if this option is not set. Otherwise, Lisk Commander will assume
      you want to use one passphrase only.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --second-passphrase=prompt (to force a prompt even when a second passphrase is not always necessary)
      	- --second-passphrase='pass:my second secret passphrase' (should only be used where security is not important)
      	- --second-passphrase=env:SECOND_SECRET_PASSPHRASE
      	- --second-passphrase=file:/path/to/my/secondPassphrase.txt (takes the first line only)
      	- --second-passphrase=stdin (takes one line only)

  --no-signature
      Creates the transaction without a signature. Your passphrase will therefore not be required.

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Creates a transaction which will register the account as a delegate candidate if broadcast to the network.

EXAMPLE
  transaction:create:delegate lightcurve
```

## `lisk transaction:create:vote`

Creates a transaction which will cast votes (or unvotes) for delegate candidates using their public keys if broadcast to the network.

```
USAGE
  $ lisk transaction:create:vote

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -p, --passphrase=passphrase
      Specifies a source for your secret passphrase. Lisk Commander will prompt you for input if this option is not set.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --passphrase=prompt (default behaviour)
      	- --passphrase='pass:my secret passphrase' (should only be used where security is not important)
      	- --passphrase=env:SECRET_PASSPHRASE
      	- --passphrase=file:/path/to/my/passphrase.txt (takes the first line only)
      	- --passphrase=stdin (takes one line only)

  -s, --second-passphrase=second-passphrase
      Specifies a source for your second secret passphrase. For certain commands a second passphrase is necessary, in
      which case Lisk Commander will prompt you for it if this option is not set. Otherwise, Lisk Commander will assume
      you want to use one passphrase only.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --second-passphrase=prompt (to force a prompt even when a second passphrase is not always necessary)
      	- --second-passphrase='pass:my second secret passphrase' (should only be used where security is not important)
      	- --second-passphrase=env:SECOND_SECRET_PASSPHRASE
      	- --second-passphrase=file:/path/to/my/secondPassphrase.txt (takes the first line only)
      	- --second-passphrase=stdin (takes one line only)

  --no-signature
      Creates the transaction without a signature. Your passphrase will therefore not be required.

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

  --unvotes=unvotes
      Specifies the public keys for the delegate candidates you want to remove your vote from. Takes either a string of
      public keys separated by commas, or a path to a file which contains the public keys.
      	Examples:
      	- --unvotes=publickey1,publickey2
      	- --unvotes=file:/path/to/my/unvotes.txt (every public key should be on a new line)

  --votes=votes
      Specifies the public keys for the delegate candidates you want to vote for. Takes either a string of public keys
      separated by commas, or a path to a file which contains the public keys.
      	Examples:
      	- --votes=publickey1,publickey2
      	- --votes=file:/path/to/my/votes.txt (every public key should be on a new line)

DESCRIPTION
  Creates a transaction which will cast votes (or unvotes) for delegate candidates using their public keys if broadcast
  to the network.

EXAMPLE
  transaction:create:vote --votes
  215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568
  d7a3df1a1aa --unvotes
  e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a
  5077084ccba
```

## `lisk transaction:create:multisignature LIFETIME MINIMUM KEYSGROUP`

Creates a transaction which will register the account as a multisignature account if broadcast to the network, using the following arguments:

```
USAGE
  $ lisk transaction:create:multisignature LIFETIME MINIMUM KEYSGROUP

ARGUMENTS
  LIFETIME   Number of hours the transaction should remain in the transaction pool before becoming invalid.
  MINIMUM    Minimum number of signatures required for a transaction from the account to be valid.
  KEYSGROUP  Public keys to verify signatures against for the multisignature group.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -p, --passphrase=passphrase
      Specifies a source for your secret passphrase. Lisk Commander will prompt you for input if this option is not set.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --passphrase=prompt (default behaviour)
      	- --passphrase='pass:my secret passphrase' (should only be used where security is not important)
      	- --passphrase=env:SECRET_PASSPHRASE
      	- --passphrase=file:/path/to/my/passphrase.txt (takes the first line only)
      	- --passphrase=stdin (takes one line only)

  -s, --second-passphrase=second-passphrase
      Specifies a source for your second secret passphrase. For certain commands a second passphrase is necessary, in
      which case Lisk Commander will prompt you for it if this option is not set. Otherwise, Lisk Commander will assume
      you want to use one passphrase only.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --second-passphrase=prompt (to force a prompt even when a second passphrase is not always necessary)
      	- --second-passphrase='pass:my second secret passphrase' (should only be used where security is not important)
      	- --second-passphrase=env:SECOND_SECRET_PASSPHRASE
      	- --second-passphrase=file:/path/to/my/secondPassphrase.txt (takes the first line only)
      	- --second-passphrase=stdin (takes one line only)

  --no-signature
      Creates the transaction without a signature. Your passphrase will therefore not be required.

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Creates a transaction which will register the account as a multisignature account if broadcast to the network, using
  the following arguments:
  	1. Number of hours the transaction should remain in the transaction pool before becoming invalid.
  	2. Minimum number of signatures required for a transaction from the account to be valid.
  	3. Public keys to verify signatures against for the multisignature group.

EXAMPLE
  transaction:create:multisignature 24 2
  215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568
  d7a3df1a1aa
```

## `lisk transaction:get IDS`

Gets transaction information from the blockchain.

```
USAGE
  $ lisk transaction:get IDS

ARGUMENTS
  IDS  Comma-separated transaction ID(s) to get information about.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -s, --state=unsigned|unprocessed
      Get transactions based on a given state. Possible values for the state are 'unsigned' and 'unprocessed'.
      	Examples:
      	- --state=unsigned
      	- --state=unprocessed

  --limit=limit
      [default: 10] Limits the returned transactions array by specified integer amount. Maximum is 100.

  --offset=offset
      [default: 0] Offsets the returned transactions array by specified integer amount.

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

  --sender-id=sender-id
      Get transactions based by senderId which is sender's lisk address'.
      	Examples:
      	- --sender-id=12668885769632475474L

  --sort=amount:asc|amount:desc|fee:asc|fee:desc|type:asc|type:desc|timestamp:asc|timestamp:desc
      [default: timestamp:asc] Fields to sort results by.

DESCRIPTION
  Gets transaction information from the blockchain.

EXAMPLES
  transaction:get 10041151099734832021
  transaction:get 10041151099734832021,1260076503909567890
  transaction:get 10041151099734832021,1260076503909567890 --state=unprocessed
  transaction:get 10041151099734832021 --state=unsigned --sender-id=1813095620424213569L
  transaction:get --state=unsigned --sender-id=1813095620424213569L
  transaction:get --sender-id=1813095620424213569L
  transaction:get --limit=10 --sort=amount:desc
  transaction:get --limit=10 --offset=5
```

## `lisk transaction:sign [TRANSACTION]`

Sign a transaction using your secret passphrase.

```
USAGE
  $ lisk transaction:sign [TRANSACTION]

ARGUMENTS
  TRANSACTION  Transaction to sign in JSON format.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -p, --passphrase=passphrase
      Specifies a source for your secret passphrase. Lisk Commander will prompt you for input if this option is not set.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --passphrase=prompt (default behaviour)
      	- --passphrase='pass:my secret passphrase' (should only be used where security is not important)
      	- --passphrase=env:SECRET_PASSPHRASE
      	- --passphrase=file:/path/to/my/passphrase.txt (takes the first line only)
      	- --passphrase=stdin (takes one line only)

  -s, --second-passphrase=second-passphrase
      Specifies a source for your second secret passphrase. For certain commands a second passphrase is necessary, in
      which case Lisk Commander will prompt you for it if this option is not set. Otherwise, Lisk Commander will assume
      you want to use one passphrase only.
      	Source must be one of `prompt`, `pass`, `env`, `file` or `stdin`. For `pass`, `env` and `file` a corresponding
      identifier must also be provided.
      	Examples:
      	- --second-passphrase=prompt (to force a prompt even when a second passphrase is not always necessary)
      	- --second-passphrase='pass:my second secret passphrase' (should only be used where security is not important)
      	- --second-passphrase=env:SECOND_SECRET_PASSPHRASE
      	- --second-passphrase=file:/path/to/my/secondPassphrase.txt (takes the first line only)
      	- --second-passphrase=stdin (takes one line only)

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Sign a transaction using your secret passphrase.

EXAMPLE
  transaction:sign
  '{"amount":"100","recipientId":"13356260975429434553L","senderPublicKey":null,"timestamp":52871598,"type":0,"fee":"100
  00000","recipientPublicKey":null,"asset":{}}'
```

## `lisk transaction:verify [TRANSACTION]`

Verifies a transaction has a valid signature.

```
USAGE
  $ lisk transaction:verify [TRANSACTION]

ARGUMENTS
  TRANSACTION  Transaction to verify in JSON format.

OPTIONS
  -j, --[no-]json
      Prints output in JSON format. You can change the default behaviour in your config.json file.

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

  --second-public-key=second-public-key
      Specifies a source for providing a second public key to the command. The second public key must be provided via this
      option. Sources must be one of `file` or `stdin`. In the case of `file`, a corresponding identifier must also be
      provided.

      	Note: if both transaction and second public key are passed via stdin, the transaction must be the first line.

      	Examples:
      	- --second-public-key file:/path/to/my/message.txt
      	- --second-public-key 790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951

DESCRIPTION
  Verifies a transaction has a valid signature.

EXAMPLES
  transaction:verify '{"type":0,"amount":"100",...}'
  transaction:verify '{"type":0,"amount":"100",...}'
  --second-public-key=647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6
```
