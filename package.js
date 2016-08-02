Package.describe({
    name: 'deanius:uni-method',
    summary: 'Improved DDP method invocation over Meteor.call/methods',
    version: '1.0.0',
    git: 'https://github.com/deanius/meteor-uniMethod'
})

Npm.depends({
    'bluebird': '3.4.1'
})

Package.onUse(function(api) {
  // Meteor releases below this version are not supported
    api.versionsFrom('1.3')

  // Core packages and 3rd party packages
    api.use('ecmascript')
    api.use('mdg:validated-method')

  // The files of this package
    api.addFiles('index.js')

  // The variables that become global for users of your package
    api.export('UniMethod')
})

Package.onTest(function(api) {
    api.use('tinytest')
    api.use('ecmascript')

    api.use('deanius:uni-method')
    api.addFiles('uniMethod.test.js')
})
