# `lisk account`

Commands relating to Lisk accounts.

* [`lisk account:create`](#lisk-account-create)
* [`lisk account:get ADDRESSES`](#lisk-account-get-addresses)
* [`lisk account:show`](#lisk-account-show)

## `lisk account:create`

Returns a randomly-generated mnemonic passphrase with its corresponding public/private key pair and Lisk address.

```
USAGE
  $ lisk account:create

OPTIONS
  -j, --[no-]json      Prints output in JSON format. You can change the default behaviour in your config.json file.

  -n, --number=number  [default: 1] Number of accounts to create.

  --[no-]pretty        Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table.
                       You can change the default behaviour in your config.json file.

DESCRIPTION
  Returns a randomly-generated mnemonic passphrase with its corresponding public/private key pair and Lisk address.

EXAMPLES
  account:create
  account:create --number=3
```

## `lisk account:get ADDRESSES`

Gets account information from the blockchain.

```
USAGE
  $ lisk account:get ADDRESSES

ARGUMENTS
  ADDRESSES  Comma-separated address(es) to get information about.

OPTIONS
  -j, --[no-]json  Prints output in JSON format. You can change the default behaviour in your config.json file.

  --[no-]pretty    Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You
                   can change the default behaviour in your config.json file.

DESCRIPTION
  Gets account information from the blockchain.

EXAMPLES
  account:get 3520445367460290306L
  account:get 3520445367460290306L,2802325248134221536L
```

## `lisk account:show`

Shows account information for a given passphrase.

```
USAGE
  $ lisk account:show

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

  --[no-]pretty
      Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the
      default behaviour in your config.json file.

DESCRIPTION
  Shows account information for a given passphrase.

EXAMPLE
  account:show
```
