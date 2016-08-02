/* eslint-disable no-eval, prefer-rest-params */
import Promise from 'bluebird'
import { Meteor } from 'meteor/meteor'
import { _ } from 'meteor/underscore'
import { ValidatedMethod } from 'meteor/mdg:validated-method'

export const nameUniMethod = function(ddpName) {
    let camelize = (str) =>
        str.replace(/[-_\s]+(.)?/g, (match, c) =>
            (c ? c.toUpperCase() : '')
        )

    let methodName = camelize(ddpName.replace('.', '-'))

    let idRegex = /^[a-zA-Z0-9]+$/
    // https://gist.github.com/mathiasbynens/6334847
    let reservedRegex = /^(do|if|in|for|let|new|try|var|case|else|enum|eval|null|this|true|void|with|await|break|catch|class|const|false|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/ // eslint-disable-line max-len
    if (! idRegex.test(methodName)) {
        throw new Error(`${methodName} can not be made into a valid javascript identifier`)
    }
    if (reservedRegex.test(methodName)) {
        throw new Error(`${methodName} can not be a JavaScript keyword`)
    }
    return methodName
}

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

        let methodName = nameUniMethod(ddpName)

        let returnFunction = null
        eval(`
            returnFunction = function ${methodName} (arg, oopsArg) {
                if (oopsArg) {
                    throw new Error('UniMethod expects a single object of named parameters.')
                }
                return uniMethodBody(arg)
            }
        `)

        UniMethodObj[ddpName] = returnFunction

        return returnFunction
    }
}

// Meteor requires this means of exporting
UniMethod = UniMethodObj // eslint-disable-line no-undef
