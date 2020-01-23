# Untitled string in LiskProtocolSpec Schema

```txt
https://lisk.io/schemas/protocol_specs#/properties/runner
```

A string identifier to point to a protocol spec name e.g. dpos, bft

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                     |
| :------------------ | ---------- | -------------- | ----------------------- | :---------------- | --------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [lisk_protocol_specs.schema.json\*](../lisk_protocol_specs.schema.json 'open original schema') |

## runner Type

`string`

## runner Constraints

**maximum length**: the maximum number of characters for this string is: `100`

**minimum length**: the minimum number of characters for this string is: `3`

**pattern**: the string must match the following regular expression:

```regexp
[a-z0-9_]*
```

[try pattern](https://regexr.com/?expression=%5Ba-z0-9_%5D* 'try regular expression with regexr.com')
