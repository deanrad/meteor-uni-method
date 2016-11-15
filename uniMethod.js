/* eslint-disable no-eval, prefer-rest-params */
import { Meteor } from 'meteor/meteor'
import { _ } from 'meteor/underscore'
import { ValidatedMethod } from 'meteor/mdg:validated-method'

const UniMethodObj = {
    methods(defs) {
        return _.reduce(defs, (all, definition, name) => {
            all[name] = UniMethodObj.define(name, definition)
            return all
        }, {})
    },

    /*
        opts can be - the function to run, which will be run
        in both locations

        serverMethod: the actual server code
        clientMethod: the UI stub, or none. Doesn't make server call if:
          - throws exception
          - returns truthy with mayBeLocallyFulfilled: true
        validate:
        applyOptions:
        mayBeLocallyFulfilled: changes behavior of clientMethod
    */
    define(ddpName, opts) {
        if (_.isFunction(opts)) {
            let fn = opts
            opts = {
                clientMethod: fn,
                serverMethod: fn
            }
        }

        // Set up the workhorse, passing it values for setup.
        // The UniMethod wrapper bypasses it in the case of mayBeLocallyFulfilled
        let mdgMethod = new ValidatedMethod({
            name: ddpName,
            validate: opts.validate || function() {},
            applyOptions: opts.applyOptions,
            run: function (...args) {
                if (this.isSimulation) {
                    return opts.clientMethod.apply(this, args)
                }
                return opts.serverMethod.apply(this, args)
            }
        })

        // The implementation of the wrapper over mdgMethod.call which returns
        // {
        //     optimisticValue      // return value of clientMethod
        //     finalValue           // a promise for the 'final' answer
        //     then, catch          // fns that delegate to the finalValue Promise
        // }

        // For reference sake:
        // https://guide.meteor.com/methods.html#what-is-a-method
        // https://guide.meteor.com/methods.html#validated-method
        //
        // mdgMethod.call, on the client:
        // - returns the value of the optimistic stub
        // - invokes its final argument as an errback with (err, result)
        // mdgMethod.call, on the server:
        // - uses Fibers to appear to synchronously deliver the value
        function clientSideUniMethod(arg) { // eslint-disable-line no-unused-vars
            let optimisticValue = opts.clientMethod.call(null, arg)
            let serverReturnPromise

            // shortcut the server upon a truthy result for these kinds of methods
            if (opts.mayBeLocallyFulfilled && optimisticValue) {
                serverReturnPromise = Promise.resolve(optimisticValue)
            } else {
                serverReturnPromise = new Promise((resolve, reject) => {
                    optimisticValue = mdgMethod.call(arg, (err, result) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(result)
                        }
                        return undefined // dont return from callback - screws it up!
                    })
                })
            }

            return {
                optimisticValue: optimisticValue,
                finalValue: serverReturnPromise,
                then: function(success, err) {
                    return this.finalValue.then(success, err)
                },
                catch: function(err) {
                    return this.finalValue.catch(err)
                }
            }
        }

        const universalMethod = (arg, oopsArg) => {
            if (oopsArg) {
                throw new Error('UniMethod expects a single object of named parameters.')
            }
            if (Meteor.isServer) {
                // Keep the simple, Fiber-based sync-style API on the server
                return mdgMethod.call(arg)
            }
            return clientSideUniMethod(arg)
        }

        UniMethodObj[ddpName] = universalMethod

        return universalMethod
    }
}

// allow Promise-based calling of DDP methods not defined via UniMethod
if (Meteor.isClient) {
    UniMethodObj.call = (name, ...args) =>
        new Promise((resolve, reject) => {
            Meteor.call(name, ...args, (err, result) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
                return undefined
            })
        })
}

export const UniMethod = UniMethodObj
