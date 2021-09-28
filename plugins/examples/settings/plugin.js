/**
 * KeeWeb plugin: settings-example
 * @author antelle
 * @license MIT
 */

module.exports.getSettings = function () {
    return [
        {
            name: 'MyText',
            label: 'Text setting',
            type: 'text',
            maxlength: 20,
            placeholder: 'Please enter something',
            value: ''
        },
        {
            name: 'MySel',
            label: 'Select setting',
            type: 'select',
            options: [
                { value: 'apple', label: 'Green apple' },
                { value: 'banana', label: 'Yellow banana' }
            ],
            value: 'banana'
        },
        {
            name: 'MyCheckbox',
            label: 'Checkbox setting',
            type: 'checkbox',
            value: true
        }
    ];
};

module.exports.setSettings = function (changes) {
    // apply changed settings in plugin logic
    // this method will be called:
    // 1. when any of settings fields is modified by user
    // 2. after plugin startup, with saved values
    // only changed settings will be passed
    // example: { MyText: 'value', MySel: 'selected-value', MyCheckbox: true }
};

module.exports.uninstall = function () {};
