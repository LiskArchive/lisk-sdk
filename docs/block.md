# `lisk block`

Commands relating to Lisk blocks.

* [`lisk block:get BLOCKIDS`](#lisk-block-get-blockids)

## `lisk block:get BLOCKIDS`

Gets block information from the blockchain.

```
USAGE
  $ lisk block:get BLOCKIDS

ARGUMENTS
  BLOCKIDS  Comma-separated block ID(s) to get information about.

OPTIONS
  -j, --[no-]json  Prints output in JSON format. You can change the default behaviour in your config.json file.

  --[no-]pretty    Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You
                   can change the default behaviour in your config.json file.

DESCRIPTION
  Gets block information from the blockchain.

EXAMPLES
  block:get 17108498772892203620
  block:get 17108498772892203620,8541428004955961162
```
