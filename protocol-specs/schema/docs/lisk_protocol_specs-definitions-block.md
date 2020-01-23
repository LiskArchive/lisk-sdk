# Block Schema

```txt
https://lisk.io/schemas/protocol_specs#/definitions/ChainState/properties/chain/items
```

Schema to specify and validate blocks in JSON specs

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                     |
| :------------------ | ---------- | -------------- | ------------ | :---------------- | --------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [lisk_protocol_specs.schema.json\*](../lisk_protocol_specs.schema.json 'open original schema') |

## items Type

`object` ([Block](lisk_protocol_specs-definitions-block.md))

# Block Properties

| Property                                      | Type          | Required | Nullable       | Defined by                                                                                                                                                                               |
| :-------------------------------------------- | ------------- | -------- | -------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [id](#id)                                     | `string`      | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-id.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/id')                                     |
| [height](#height)                             | `integer`     | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-height.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/height')                             |
| [blockSignature](#blockSignature)             | `string`      | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-blocksignature.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/blockSignature')             |
| [generatorPublicKey](#generatorPublicKey)     | `string`      | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-generatorpublickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/generatorPublicKey')     |
| [numberOfTransactions](#numberOfTransactions) | `integer`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-numberoftransactions.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/numberOfTransactions') |
| [payloadHash](#payloadHash)                   | `string`      | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-payloadhash.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/payloadHash')                   |
| [payloadLength](#payloadLength)               | `integer`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-payloadlength.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/payloadLength')               |
| [previousBlockId](#previousBlockId)           | `string`      | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-previousblockid.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/previousBlockId')           |
| [timestamp](#timestamp)                       | `integer`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-timestamp.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/timestamp')                       |
| [totalAmount](#totalAmount)                   | Not specified | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-totalamount.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/totalAmount')                   |
| [totalFee](#totalFee)                         | Not specified | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-totalfee.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/totalFee')                         |
| [reward](#reward)                             | Not specified | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-reward.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/reward')                             |
| [transactions](#transactions)                 | `array`       | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-transactions.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/transactions')                 |
| [version](#version)                           | `integer`     | Required | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-version.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/version')                           |

## id

`id`

- is optional
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-id.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/id')

### id Type

`string`

### id Constraints

**maximum length**: the maximum number of characters for this string is: `20`

**minimum length**: the minimum number of characters for this string is: `1`

**unknown format**: the value of this string must follow the format: `id`

## height

`height`

- is optional
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-height.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/height')

### height Type

`integer`

## blockSignature

`blockSignature`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-blocksignature.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/blockSignature')

### blockSignature Type

`string`

### blockSignature Constraints

**unknown format**: the value of this string must follow the format: `signature`

## generatorPublicKey

`generatorPublicKey`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-generatorpublickey.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/generatorPublicKey')

### generatorPublicKey Type

`string`

### generatorPublicKey Constraints

**unknown format**: the value of this string must follow the format: `publicKey`

## numberOfTransactions

`numberOfTransactions`

- is required
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-numberoftransactions.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/numberOfTransactions')

### numberOfTransactions Type

`integer`

## payloadHash

`payloadHash`

- is required
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-payloadhash.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/payloadHash')

### payloadHash Type

`string`

### payloadHash Constraints

**unknown format**: the value of this string must follow the format: `hex`

## payloadLength

`payloadLength`

- is required
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-payloadlength.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/payloadLength')

### payloadLength Type

`integer`

## previousBlockId

`previousBlockId`

- is optional
- Type: `string`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-previousblockid.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/previousBlockId')

### previousBlockId Type

`string`

### previousBlockId Constraints

**maximum length**: the maximum number of characters for this string is: `20`

**minimum length**: the minimum number of characters for this string is: `1`

**unknown format**: the value of this string must follow the format: `id`

## timestamp

`timestamp`

- is required
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-timestamp.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/timestamp')

### timestamp Type

`integer`

## totalAmount

`totalAmount`

- is required
- Type: unknown
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-totalamount.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/totalAmount')

### totalAmount Type

unknown

### totalAmount Constraints

**unknown format**: the value of this string must follow the format: `amount`

## totalFee

`totalFee`

- is required
- Type: unknown
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-totalfee.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/totalFee')

### totalFee Type

unknown

### totalFee Constraints

**unknown format**: the value of this string must follow the format: `amount`

## reward

`reward`

- is required
- Type: unknown
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-reward.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/reward')

### reward Type

unknown

### reward Constraints

**unknown format**: the value of this string must follow the format: `amount`

## transactions

`transactions`

- is required
- Type: `array`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-transactions.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/transactions')

### transactions Type

`array`

### transactions Constraints

**unique items**: all items in this array must be unique. Duplicates are not allowed.

## version

`version`

- is required
- Type: `integer`
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-block-properties-version.md 'https://lisk.io/schemas/protocol_specs#/definitions/Block/properties/version')

### version Type

`integer`

### version Constraints

**minimum**: the value of this number must greater than or equal to: `0`
