const { client } = require('nightwatch-api')

module.exports = {
    url() {
      return this.api.launch_url;
    },
    commands: {
        createNewMasterKey(masterPassword) {
            return this
                .useXpath()
                .waitForElementVisible('@newButton')
                .click('@newButton')
                .pause(1000)
                .waitForElementVisible('@footerLockButton')
                .click('@footerLockButton')
                .pause(1000)
                .waitForElementVisible('@masterPasswordInput')
                .setValue('@masterPasswordInput', masterPassword)
                .pause(1000)
                .waitForElementVisible('@masterPasswordConfirmInput')
                .setValue('@masterPasswordConfirmInput', masterPassword)
                .waitForElementVisible('@saveToButton')
                .click('@saveToButton')
                .pause(1000)
                .waitForElementVisible('@fileButton')
                .click('@fileButton')
                .pause(4000)
        },
        logOut() {
            this
                .waitForElementVisible('@lockButton')
                .click('@lockButton')
        },
        loginUsingMasterKey(masterPassword) {
            this.logOut()
            return this
                .useXpath()
                .waitForElementVisible('@loginPasswordInput')
                .setValue('@loginPasswordInput', [masterPassword, client.Keys.ENTER])
        }

    },
    elements: {
        newButton: {
            selector: "//i[@class='fa fa-plus open__icon-i']",
            locateStrategy: "xpath"
        },
        footerLockButton: {
            selector: '//div[contains(@class, "footer__db-item")]',
            locateStrategy: "xpath"
        },
        masterPasswordInput: {
            selector: '//input[@id="settings__file-master-pass"]',
            locateStrategy: "xpath"
        },
        masterPasswordConfirmInput: {
            selector: '//input[@id="settings__file-confirm-master-pass"]',
            locateStrategy: "xpath"
        },
        saveToButton: {
            selector: '//button[@class="settings__file-button-save-choose btn-silent"]',
            locateStrategy: "xpath"
        },
        fileButton: {
            selector: '//i[@class="fa fa-file-text-o"]',
            locateStrategy: "xpath"
        },
        lockButton: {
            selector: '//div[@id="footer__btn-lock"]',
            locateStrategy: "xpath"
        },
        loginPasswordInput: {
            selector: '//input[@name="password" and @class="open__pass-input"]',
            locateStrategy: "xpath"
        },
        homePageHeader: {
            selector: '//div[@class="app__details show"]',
            locateStrategy: "xpath"
        }
    }
}
