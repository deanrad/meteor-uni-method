# deanius:uni-method [![Build Status](https://img.shields.io/travis/deanius/meteor-uni-method.svg)](https://travis-ci.org/deanius/meteor-uni-method) ![ES 2015](https://img.shields.io/badge/ES-2015-brightgreen.svg) ![twitter link](https://img.shields.io/badge/twitter-@deaniusaur-55acee.svg)
## Advantages

* No callbacks. Promises.
* No positional arguments. Named arguments.
* No magic strings. Callable objects.
* No `.call`. Just call it as a function

## Install 

`meteor add deanius:uni-method`

## Usage:

```
Posts.update = UniMethod.define('post.update', function({_id, changes})...)

Posts.update({_id: 1, changes: {foo: 'bar'}})
  .then(result => ...)
  .catch(err => ...)
```

## Overview
Based on, and similar to [`mdg:validated-method`](https://atmospherejs.com/mdg/validated-method), but differing in client-side behavior.

A function created via UniMethod.define returns a Promise for the
server value. It can be created with a single function, or with
an object {clientStub, serverMethod}, in which case the return value
will have fields `optimisticValue` and `finalValue [Promise]`, and
still behave as a `then`able.

Before:

```
Meteor.methods({foo: (arg1, arg2) => true)

Meteor.call('foo', 'arg1', 'arg2', (err, result) => {
    if (err) ...
})
```

Before: (MDG version)

```
let arg1 = 'arg1', arg2 = arg2
let fooMethod = new ValidatedMethod({
  name: 'foo',
  run: (argObject) => true
})
let clientValue = fooMethod.call({arg1, arg2}, (err, result) => {
    if (err) ...
    let serverValue = result
})
```

After:

```
let fooMethod = UniMethod.define('foo', ({arg1, arg2}) => true)
fooMethod({arg1, arg2})

or

let methods = UniMethod.methods({
    foo: ({arg1, arg2}) => true
})
methods.foo(arg1, arg2)
```

# Legacy

You can also call methods that are not defined with UniMethod:

```
UniMethod.call('legacy-ddp', ...args)
  .then(result => ...)
  .catch(err => ...)
```
