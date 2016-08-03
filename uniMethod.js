/* eslint-disable no-eval, prefer-rest-params */
import Promise from 'bluebird'
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
                clientStub: fn,
                serverMethod: fn
            }
        }

        let mdgMethod = new ValidatedMethod({
            name: ddpName,
            validate: opts.validate || function() {},
            applyOptions: opts.applyOptions,
            run: function (...args) {
                if (this.isSimulation) {
                    return opts.clientStub.apply(this, args)
                }
                return opts.serverMethod.apply(this, args)
            }
        })

        function uniMethodBody(arg) { // eslint-disable-line no-unused-vars
            // Keep the simple, Fiber-based sync-style API on the server
            if (Meteor.isServer) return mdgMethod.call(arg)

            let clientStubReturn = null

            let serverReturnPromise = new Promise((resolve, reject) => {
                clientStubReturn = mdgMethod.call(arg, (err, result) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(result)
                    }
                    return undefined // dont return from callback - screws it up!
                })
            })

            return {
                optimisticValue: clientStubReturn,
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

export default UniMethodObj

// Meteor requires this means of exporting
// eslint-disable-next-line no-undef
UniMethod = UniMethodObj
