import { Meteor } from 'meteor/meteor'
import { expect } from 'meteor/practicalmeteor:chai'
import UniMethod from './uniMethod'

let shouldNotBeHere = () => { throw new Error('should not be here') }
let isBluebird = (promiseInstance) => (!! promiseInstance.constructor.props)

describe('UniMethod.methods({})', () => {
    it('Should produce an object whose values are UniMethods', () => {
        let result = UniMethod.methods({
            simple: (arg) => {
                return (Meteor.isClient ? 'client' : 'server') + '/' + arg
            },
            clientServer: {
                clientStub: function(arg) { return 'Client Stub Value: ' + arg },
                serverMethod: function(arg) { return 'Real Server Value: ' + arg }
            }
        })
        expect(result).to.be.instanceof(Object)
        expect(result.simple).to.be.instanceof(Function)
        expect(result.clientServer).to.be.instanceof(Function)
    })
})

describe('UniMethod.define', () => {
    let subject = UniMethod.define('client-server-method', {
        clientStub: function(arg) { return 'Client Stub Value: ' + arg },
        serverMethod: function(arg) { return 'Real Server Value: ' + arg }
    })

    it('Returns a function', () => {
        expect(subject).to.be.instanceof(Function)
    })

    describe('The returned function', () => {
        describe('calling it', () => {
            it('should throw if called with > 1 argument', () => {
                let arg1 = 'arg1'
                expect(subject.bind(null, arg1, 'b')).to.throw(Error)
            })
            it('may be called with 0 arguments', () => {
                if (Meteor.isServer) {
                    expect(subject()).to.include('Real Server Value:')
                } else {
                    return subject().then(
                        v => expect(v).to.include('Real Server Value:'),
                        shouldNotBeHere
                    )
                }
            })
        })
    })

    describe('When defined with name and function, calling it', () => {
        let subject = UniMethod.define('name-and-function', (arg) => {
            return (Meteor.isClient ? 'client' : 'server') + '/' + arg
        })
        let result = subject('arg1')

        it('runs the same code on the client and server', () => {
            expect(true).to.equal(true) // hard to demonstrate, but worth documenting w/ a test
        })

        if (Meteor.isClient) {
            it('has a "then" method, and acts as a Promise', () => {
                expect(result).to.have.property('then')

                return result.then(
                  v => expect(v).to.equal('server/arg1'),
                  shouldNotBeHere
                )
            })

            it('has a "catch" method, and acts as a Promise', () => {
                expect(result).to.have.property('catch')

                return result.catch(shouldNotBeHere)
            })

            it('contains the result of the clientStub in #optimisticValue', () => {
                expect(result.optimisticValue).to.equal('client/arg1')
            })

            it('contains a Bluebird promise for the real (server) result in  #finalValue', () => {
                expect(result.finalValue).to.have.property('then')
                expect(isBluebird(result.finalValue))
                /* ALWAYS return the promise chain from the test or you'll silence errors! */
                return result.finalValue.then(
                    v => expect(v).to.equal('server/arg1'),
                    shouldNotBeHere
                )
            })
        }

        if (Meteor.isServer) {
            it('returns an immediate value', () => {
                expect(result).to.equal('server/arg1')
            })
        }
    })

    describe('When defined with name, {clientStub, serverMethod}, calling it', () => {
        if (Meteor.isClient) {
            let result = subject('arg1')

            it('has a "then" method, and acts as Bluebird promise', () => {
                expect(result).to.have.property('then')

                return result.then(
                  v => expect(v).to.equal('Real Server Value: arg1'),
                  shouldNotBeHere
                )
            })

            it('has a "catch" method, and acts as Bluebird promise', () => {
                expect(result).to.have.property('catch')

                return result.catch(shouldNotBeHere)
            })

            it('contains the result of the clientStub in #optimisticValue', () => {
                expect(result.optimisticValue).to.equal('Client Stub Value: arg1')
            })

            it('contains a Bluebird promise for the real (server) result in  #finalValue', () => {
                expect(result.finalValue).to.have.property('then')
                expect(isBluebird(result.finalValue))
                /* ALWAYS return the promise chain from the test or you'll silence errors! */
                return result.finalValue.then(
                    v => expect(v).to.equal('Real Server Value: arg1'),
                    shouldNotBeHere
                )
            })
        }

        if (Meteor.isServer) {
            it('returns an immediate value', () => {
                let result = subject('arg1')
                expect(result).to.equal('Real Server Value: arg1')
            })
        }
    })
})
