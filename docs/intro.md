![Lisk Logo](https://lisk.io/content/12-brand-style-guide/modules/2-brand-site-logo-113kyc5/logo-dark.svg)

# Lisk JSDoc Source code documentation

This is an ongoing process

## Best Practices

* To indicate the data type for a `@param` or `@return` tag, put the data type in `{}` brackets: `@param {TheType} paramName` or `@return {TheType}`.
  For non-object data, use `number`, `string`, `boolean`, `null`, `undefined`, `Object`, `function`, `Array`.
  For particular objects, use the constructor name; this could be a built-in JavaScript class (`Date`, `RegExp`) or custom classes.
* This can be a number or a boolean. `{(number|boolean)}`
* A number or null: `{?number}`
* A number, but never null: `{!number}`
* Variable number of that type `@param {...number} num`
* Optional parameter `@param {number} [foo]` or `@param {number=} foo`
* An optional parameter foo with default value 1. `@param {number} [foo=1]`
* [multiple types and repeatable parameters](http://usejsdoc.org/tags-param.html#multiple-types-and-repeatable-parameters)

* when documenting an object that is not being used as a `namespace` or `class`, use `@prop {type} name` tags to document its properties (these work like `@param` for function parameters).

* Use `@name` to tell JSDoc the name of what is being documented, if it is not the same as the name in the code.

* No need to use `@function` in most cases - JSDoc will assume anything declared as a function is a regular function or method.

#### Tag order

Tags available should be declared in the following order:

```js
@typedef
@namespace
@class
@event
@func

@property

@param
@return

@throws

@deprecated
@see
@todo
```

## Syntax

### Membership

`@namespace [[{<type>}] <SomeName>]`:
describes a parent folder or object.
`@memberof <parentNamepath>`:
identifies a member symbol that belongs to a parent symbol. Usable for code tagged as @class or @namespace.
`@memberof! <parentNamepath>`:
forces JSDoc to document a property of an object that is an instance member of a class.
[Examples](http://usejsdoc.org/tags-memberof.html#examples)

### Entities

`@class [<type> <name>]`:
marks a function as being a constructor, meant to be called with the new keyword to return an instance.

`@func [<FunctionName>]`:
marks an object as being a function, even though it may not appear to be one to the parser

`@module [[{<type>}] module:<moduleName>]`:
marks the current file as being its own module. All symbols in the file are assumed to be members of the module unless documented otherwise.

#### Symbols, Parameters, Variables

`@typedef [<type>] <namepath>`:
custom types, particularly if you wish to refer to them repeatedly.

`@param {type} name - description`:
name, type, and description of a function parameter. **Required** for each parameter of a function.
[examples](http://usejsdoc.org/tags-param.html)

### Behavior

`@return`: **required** for all functions with an explicit return statement.

`@throws {<type>} free-form description`: an error that a function might throw.

### Events

`@event <className>#[event:]<eventName>`: **describes** an event, that the app is listening to.

## Examples

For concrete examples, have a look in the aready existing JSDoc blocks in the code.

#### ToDO

* [ ] JSDoc template
* [ ] Markdown plugin
* [ ] Patterns examples
* [ ] More Lisk examples: callback, throws, class, nested objects
* [ ] JSDoc tutorials for best practices
* [ ] Callback patterns
  * node style: cb(err, data); - `app.js`
  * setImmediate style: return setImmediate(cb, null, data); - `modules/blocks.js`
  * next style: cb(); - `app.js`
