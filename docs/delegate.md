# `lisk delegate`

Commands relating to Lisk delegates.

* [`lisk delegate:get USERNAMES`](#lisk-delegate-get-usernames)
* [`lisk delegate:voters USERNAMES`](#lisk-delegate-voters-usernames)
* [`lisk delegate:votes USERNAMES`](#lisk-delegate-votes-usernames)

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

## `delegate:voters USERNAMES`

Gets voters information for given delegate(s) from the blockchain.

```
USAGE
  $ lisk delegate:voters USERNAMES

ARGUMENTS
  USERNAMES  Comma-separated username(s) to get information about.

OPTIONS
  --limit          Limits the returned voters array by specified integer amount. Maximum is 100.

  --offset         Offsets the returned voters array by specified integer amount.

  --sort           Sorts the returned voters array. Sort type must be one of `publicKey:asc`, `publicKey:desc`, `balance:asc`, `balance:desc`, `username:asc` or `username:desc`.

  --[no-]pretty    Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You
                   can change the default behaviour in your config.json file.


DESCRIPTION
  Gets voters information for given delegate(s) from the blockchain.

EXAMPLES
  delegate:voters lightcurve
  delegate:voters lightcurve,4miners.net
  delegate:voters lightcurve,4miners.net --limit 20 --offset 5 --sort publicKey:asc --pretty
```

## `delegate:votes ADDRESSES`

Gets votes information for given delegate(s) from the blockchain.

```
USAGE
  $ lisk delegate:votes ADDRESSES

ARGUMENTS
  ADDRESSES  Comma-separated address(es) to get information about.

OPTIONS
  --limit          Limits the returned voters array by specified integer amount. Maximum is 100.

  --offset         Offsets the returned voters array by specified integer amount.

  --sort           Sorts the returned voters array. Sort type must be one of `balance:asc`, `balance:desc`, `username:asc` or `username:desc`.

  --[no-]pretty    Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You
                   can change the default behaviour in your config.json file.


DESCRIPTION
  Gets voters information for given delegate(s) from the blockchain.

EXAMPLES
  delegate:votes 13133549779353512613L
  delegate:votes 13133549779353512613L,16010222169256538112L
  delegate:votes 13133549779353512613L,16010222169256538112L --limit 20 --offset 5 --sort balance:asc --pretty
```
