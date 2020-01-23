# Account Schema

```txt
https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/accounts/items
```

Schema to specify and validate account in JSON specs

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                     |
| :------------------ | ---------- | -------------- | ------------ | :---------------- | --------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [lisk_protocol_specs.schema.json\*](../lisk_protocol_specs.schema.json 'open original schema') |

## items Type

`object` ([Account](lisk_protocol_specs-definitions-account.md))

# Account Properties

| Property                            | Type         | Required | Nullable       | Defined by                                                                                                                                                                         |
| :---------------------------------- | ------------ | -------- | -------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [address](#address)                 | `string`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-address.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/address')                 |
| [publicKey](#publicKey)             | `string`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-publickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/publicKey')             |
| [secondPublicKey](#secondPublicKey) | Unknown Type | Optional | can be null    | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-secondpublickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/secondPublicKey') |
| [username](#username)               | Unknown Type | Optional | can be null    | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-username.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/username')               |
| [isDelegate](#isDelegate)           | `boolean`    | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-isdelegate.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/isDelegate')           |
| [secondSignature](#secondSignature) | `boolean`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-secondsignature.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/secondSignature') |
| [nameExist](#nameExist)             | `boolean`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-nameexist.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/nameExist')             |
| [balance](#balance)                 | Unknown Type | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-balance.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/balance')                 |
| [multiMin](#multiMin)               | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-multimin.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/multiMin')               |
| [multiLifetime](#multiLifetime)     | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-multilifetime.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/multiLifetime')     |
| [missedBlocks](#missedBlocks)       | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-missedblocks.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/missedBlocks')       |
| [producedBlocks](#producedBlocks)   | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-producedblocks.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/producedBlocks')   |
| [rank](#rank)                       | Unknown Type | Optional | can be null    | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-rank.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/rank')                       |
| [fees](#fees)                       | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-fees.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/fees')                       |
| [rewards](#rewards)                 | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-rewards.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/rewards')                 |
| [vote](#vote)                       | Unknown Type | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-vote.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/vote')                       |
| [productivity](#productivity)       | `integer`    | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-productivity.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/productivity')       |

## address

`address`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-address.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/address')

### address Type

`string`

## publicKey

`publicKey`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-publickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/publicKey')

### publicKey Type

`string`

## secondPublicKey

`secondPublicKey`

- is optional
- Type: `string`
- can be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-secondpublickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/secondPublicKey')

### secondPublicKey Type

`string`

## username

`username`

- is optional
- Type: `string`
- can be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-username.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/username')

### username Type

`string`

## isDelegate

`isDelegate`

- is required
- Type: `boolean`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-isdelegate.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/isDelegate')

### isDelegate Type

`boolean`

## secondSignature

`secondSignature`

- is optional
- Type: `boolean`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-secondsignature.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/secondSignature')

### secondSignature Type

`boolean`

## nameExist

`nameExist`

- is optional
- Type: `boolean`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-nameexist.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/nameExist')

### nameExist Type

`boolean`

## balance

`balance`

- is required
- Type: any of the folllowing: `string` or `integer` ([Details](lisk_protocol_specs-definitions-account-properties-balance.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-balance.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/balance')

### balance Type

any of the folllowing: `string` or `integer` ([Details](lisk_protocol_specs-definitions-account-properties-balance.md))

## multiMin

`multiMin`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-multimin.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/multiMin')

### multiMin Type

`integer`

## multiLifetime

`multiLifetime`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-multilifetime.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/multiLifetime')

### multiLifetime Type

`integer`

## missedBlocks

`missedBlocks`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-missedblocks.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/missedBlocks')

### missedBlocks Type

`integer`

## producedBlocks

`producedBlocks`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-producedblocks.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/producedBlocks')

### producedBlocks Type

`integer`

## rank

`rank`

- is optional
- Type: `integer`
- can be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-rank.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/rank')

### rank Type

`integer`

## fees

`fees`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-fees.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/fees')

### fees Type

`integer`

## rewards

`rewards`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-rewards.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/rewards')

### rewards Type

`integer`

## vote

`vote`

- is optional
- Type: any of the folllowing: `string` or `integer` ([Details](lisk_protocol_specs-definitions-account-properties-vote.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-vote.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/vote')

### vote Type

any of the folllowing: `string` or `integer` ([Details](lisk_protocol_specs-definitions-account-properties-vote.md))

## productivity

`productivity`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-account-properties-productivity.md 'https://lisk.io/schemas/protocol_specs#/definitions/Account/properties/productivity')

### productivity Type

`integer`
