# `lisk delegate`

Commands relating to Lisk delegates.

* [`lisk delegate:get USERNAMES`](#lisk-delegate-get-usernames)

## `lisk delegate:get USERNAMES`

Gets delegate information from the blockchain.

```
USAGE
  $ lisk delegate:get USERNAMES

ARGUMENTS
  USERNAMES  Comma-separated username(s) to get information about.

OPTIONS
  -j, --[no-]json  Prints output in JSON format. You can change the default behaviour in your config.json file.

  --[no-]pretty    Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You
                   can change the default behaviour in your config.json file.

DESCRIPTION
  Gets delegate information from the blockchain.

EXAMPLES
  delegate:get lightcurve
  delegate:get lightcurve,4miners.net
```
