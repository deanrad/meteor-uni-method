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
    define(ddpName, opts) {
        if (_.isFunction(opts)) {
            let fn = opts
            opts = {
                clientMethod: fn,
                serverMethod: fn
            }
        }

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

        function uniMethodBody(arg) { // eslint-disable-line no-unused-vars
            // Keep the simple, Fiber-based sync-style API on the server
            if (Meteor.isServer) return mdgMethod.call(arg)

            let clientMethodReturn = null

            let serverReturnPromise = new Promise((resolve, reject) => {
                clientMethodReturn = mdgMethod.call(arg, (err, result) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(result)
                    }
                    return undefined // dont return from callback - screws it up!
                })
            })

            return {
                optimisticValue: clientMethodReturn,
                finalValue: serverReturnPromise,
                then: function(success, err) {
                    return this.finalValue.then(success, err)
                },
                catch: function(err) {
                    return this.finalValue.catch(err)
                }
            }
        }

        UniMethodObj[ddpName] = (arg, oopsArg) => {
            if (oopsArg) {
                throw new Error('UniMethod expects a single object of named parameters.')
            }
            return uniMethodBody(arg)
        }

        return UniMethodObj[ddpName]
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
