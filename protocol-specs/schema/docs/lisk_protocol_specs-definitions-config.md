# Config Schema

```txt
https://lisk.io/schemas/protocol_specs#/definitions/TestCase/properties/config
```

A JSON object containing all necessary configurations for the environment in which these specs were generated and individual test case can be verified.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                     |
| :------------------ | ---------- | -------------- | ------------ | :---------------- | --------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [lisk_protocol_specs.schema.json\*](../lisk_protocol_specs.schema.json 'open original schema') |

## config Type

`object` ([Config](lisk_protocol_specs-definitions-config.md))

# Config Properties

| Property                      | Type     | Required | Nullable       | Defined by                                                                                                                                             |
| :---------------------------- | -------- | -------- | -------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [initialState](#initialState) | `object` | Optional | cannot be null | [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate.md 'https://lisk.io/schemas/protocol_specs#/definitions/Config/properties/initialState') |
| Additional Properties         | Any      | Optional | can be null    |                                                                                                                                                        |

## initialState

A JSON object represents basic chain state for individual spec to be executed.

`initialState`

- is optional
- Type: `object` ([ChainState](lisk_protocol_specs-definitions-chainstate.md))
- cannot be null
- defined in: [LiskProtocolSpec](lisk_protocol_specs-definitions-chainstate.md 'https://lisk.io/schemas/protocol_specs#/definitions/Config/properties/initialState')

### initialState Type

`object` ([ChainState](lisk_protocol_specs-definitions-chainstate.md))

## Additional Properties

Additional properties are allowed and do not have to follow a specific schema
