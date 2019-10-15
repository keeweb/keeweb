const { Given, When, Then } = require('cucumber')
const { client } = require('nightwatch-api')

Given('the user has browsed to the login page', () => client.page.infoPage().navigate());

When('the user creates new master password as {string}', function (masterPassword) {
 return client.page.infoPage().createNewMasterKey(masterPassword)
});

When('the user re-logs in using password {string}', function (masterPassword) {
 return client.page.infoPage().loginUsingMasterKey(masterPassword)
});

Then('the user must redirected to the homepage', () => {
  return client.page.infoPage().waitForElementVisible('@homePageHeader')
});


