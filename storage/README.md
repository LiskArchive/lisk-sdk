# Data Persistence Model

Entities describe a business entity persisted to storage layer.

## How to create entity

To create a new entity, extend the `BaseEntity` class which provides a generic structure to manage entities. The more sophisticated scenarios of persistence logic need to be implemented by yourself, following the easy to follow patterns, have a look for an example entity - [Account](./entities/account.js)). Each custom entity needs to implement at least the following functions:

* constructor
* getFieldSets

## Utility Methods

The following utility methods are available each class extending `BaseEntity`.

### addFilter

It provides a basic structure to register fields with for the entity

```
addFilter(fieldName, filterType = filterTypes.NUMBER, fieldSets=[])
```

You can find more details in its [implementation](./entities/base_entity.js#L63)

## Filters

Following is the list of available suffixes based on filter types:

| Filter Type | Filter Suffixes | Description                                            |
| ----------- | --------------- | ------------------------------------------------------ |
| BOOLEAN     | \_eql           | returns entries that match the value                   |
|             | \_ne            | returns entries that do not match the value            |
| TEXT        | \_eql           | returns entries that match the value                   |
|             | \_ne            | returns entries that do not match the value            |
|             | \_in            | returns entries that match any of values from the list |
|             | \_like          | returns entries that match the pattern                 |
| NUMBER      | \_eq            | returns entries that match the value                   |
|             | \_ne            | returns entries that do not match the value            |
|             | \_gt            | returns entries greater than the value                 |
|             | \_gte           | returns entries greater than or equal to the value     |
|             | \_lt            | returns entries less than the value                    |
|             | \_lte           | returns entries less than or equal to the value        |
|             | \_in            | returns entries that match any of values from the list |

You can call `<Entity>.getFilters()` to see a list of available filters for any entity.

### Filter Combinator

If filters are provided as JSON objects, they will always be joined with an `AND` combinator. For instance, specifying filters as `{name: 'Alpha', description_like: 'Bravo'}` results in fetching all results which have a name equal to `Alpha` and description matching `Bravo`. Specifying filters as an array of objects, e.g. `[{name: 'Alpha'}, {description_like: 'Bravo'}]`, will result in joining objects with `OR` combinator, i.e. fetching data which name equal to `Alpha` or description like `Bravo`.
You can register a `CUSTOM` filter, by defining your own key and a function which will return a custom condition.

## Conventions

Following conventions must be followed strictly

* Dynamic getter functions must accept `filters` object as the first parameter.
* Each entity should set fieldsets to describe the collection of fields.
* Entities should always return the full set of attributes related to a fieldset and don't implement field selection logic.
* Every interface in the entity must return `Promise` and be declared as `async`.
* Timestamp types always refer to the network Epoch timestamp. In the case of Unix timestamp, the attribute name should be prefixed with `unix_`.
* All values related to the amounts should be exposed as strings, due to the limited JavaScript integers precision (find out more while reading about Number. MAX_SAFE_INTEGER). The block height and round number can be safely stored as integers and should be exposed as integers.
* All `BYTEA` fields in 'hex' encoding should be exposed as strings. Any other encoding should be exposed as Buffer.
* When required to use constants, use `Symbol` and then export it from interface, so later everyone explicitly use those defined constants instead of strings.
