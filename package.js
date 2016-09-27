Package.describe({
    name: 'deanius:uni-method',
    summary: 'Improved DDP method invocation over Meteor.call/methods',
    version: '0.9.0',
    git: 'https://github.com/deanius/meteor-uniMethod'
})

Package.onUse(function(api) {
    // Meteor releases below this version are not supported
    api.versionsFrom('1.3')

    // Core packages and 3rd party packages
    api.use('ecmascript')
    api.use('mdg:validated-method')

    // The files of this package
    api.addFiles('uniMethod.js')

    // The variables that become global for users of your package
    api.mainModule('uniMethod.js')
})

Package.onTest(function(api) {
    api.use('ecmascript')

    api.use('practicalmeteor:mocha')
    api.use('practicalmeteor:chai')
    api.use('deanius:uni-method')

    // XXX tests currently not running in client - despite this explicit line below!
    api.addFiles('uniMethod.test.js', ['client', 'server'])
})
