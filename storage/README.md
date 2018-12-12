# Entities

Entities describe a business entity persisted to storage layer.

## How to create entity

Just extend a class from `BaseEntity` and you will have basic features. This base class provides generic structure to manage entities but don't provide hardcore SQL or persisting logic. You have to implement that logic your self. You have to implement at least these methods in your entity class.

* constructor
* getFieldSets

To look for an example Entity check [Account](./entities/account.js)

## Utility Methods

The following utility methods are available to your class when you extend from `BaseEntity`.

### addFilter

It provides a basic structure to register fields with for the entity

```
addFilter(fieldName, filterType = filterTypes.NUMBER, fieldSets=[])
```

You can find more details in its [implementation](./entities/base_entity.js#L63)

## Filters

Filters are a convention to provide a flexible but powerful structure to fetch data from the persistence layer. When you register a field in an entity you have to specify its filter type. Based on that filter type the entity registers some filter names available to be used as json objects. Each filter suffixes an additional value to the field name e.g. `_in`, `_lt`. It depends on filter type which suffixes are appended. A filter without any suffix to the field name refers to `_eql` equals.

Following is the list of available suffixes based on filter types

| Filter Type | Filter Suffixes | Description                                                |
| ----------- | --------------- | ---------------------------------------------------------- |
| BOOLEAN     | \_eql           | returns entries that matches the value                     |
|             | \_ne            | returns entries that does not matche the value             |
| TEXT        | \_eql           | returns entries that matches the value                     |
|             | \_ne            | returns entries that does not matche the value             |
|             | \_in            | returns entries that matches any values in a list          |
|             | \_like          | returns entries that matches a pattern                     |
| NUMBER      | \_eq            | returns entries that matches the value                     |
|             | \_ne            | returns entries that does not matche the value             |
|             | \_gt            | returns entries that is greater than the value             |
|             | \_gte           | returns entries that is greater then or equal to the value |
|             | \_lt            | returns entries that is less than the value                |
|             | \_lte           | returns entries that is less than or equal to the value    |
|             | \_in            | returns entries that matches any values in a list          |

You can call `<Entity>.getFilters()` to see a list of available filters for any entity.

### Filter Combinator

If filters are provided as JSON object those will always joined with `AND` combinator. e.g. Specifying filters as `{name: 'Alpha', description_like: 'Bravo'}` will result in fetching all results which have name equal to `Alpha` and `Bravo`. Specifying filters as an array of objects: `[{name: 'Alpha'}, {description_like: 'Bravo'}]` will result in joining objects with `OR` combinator and result in fetching data which name equal either `Alpha` or `Bravo`.

## Conventions

Following conventions must be followed strictly

* If getter functions are dynamic they must accept a `fitlers` object as first parameter.
* Every entity should set some field sets to describe collection of fields.
* Entities should always return full set of attributes related to a field set and never implement field selection logic.
* Every interface in the entity must return `Promise` and declared as `async`.
* Timestamp always refer to Epoch timestamp
* In case of Unix the attribute name must be prefixed with Unix
* All values related to amount should be exposed as strings
* Height should always be integer because of Number.MAX_SAFE_INTEGER is too high
* Round number should be exposed as integer
* All `BYTEA` fields with 'hex' encoding should be exposed as strings
