const { setDefaultTimeout, After, Before } = require('cucumber')
const { createSession, closeSession, startWebDriver, stopWebDriver } = require('nightwatch-api')

setDefaultTimeout(60000)

Before(async () => {
    await startWebDriver();
    await createSession();
})
After(async () => {
    await closeSession();
    await stopWebDriver();
})
