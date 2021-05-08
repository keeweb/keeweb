import { Locale } from 'util/locale';
import { StringFormat } from 'util/formatting/string-format';
import { DateFormat } from 'comp/i18n/date-format';
import { AppModel } from 'models/app-model';
import { FieldViewReadOnly } from 'views/fields/field-view-read-only';
import { FieldViewOtp } from 'views/fields/field-view-otp';
import { FieldViewSelect } from 'views/fields/field-view-select';
import { FieldViewAutocomplete } from 'views/fields/field-view-autocomplete';
import { FieldViewText } from 'views/fields/field-view-text';
import { FieldViewUrl } from 'views/fields/field-view-url';
import { FieldViewTags } from 'views/fields/field-view-tags';
import { FieldViewDate } from 'views/fields/field-view-date';
import { FieldViewHistory } from 'views/fields/field-view-history';
import { FieldViewCustom } from 'views/fields/field-view-custom';
import { FieldViewReadOnlyWithOptions } from 'views/fields/field-view-read-only-with-options';
import { ExtraUrlFieldName } from 'models/entry-model';

function createDetailsFields(detailsView) {
    const model = detailsView.model;
    const otpEntry = detailsView.matchingOtpEntry;

    const fieldViews = [];
    const fieldViewsAside = [];

    if (model.backend === 'otp-device') {
        fieldViewsAside.push(
            new FieldViewReadOnly({
                name: 'Device',
                title: StringFormat.capFirst(Locale.device),
                value() {
                    return model.device.name;
                }
            })
        );
        fieldViews.push(
            new FieldViewReadOnlyWithOptions({
                name: '$UserName',
                title: StringFormat.capFirst(Locale.user),
                aside: false,
                value() {
                    return model.user;
                },
                sequence: '{USERNAME}'
            })
        );
        fieldViews.push(
            new FieldViewOtp({
                name: '$otp',
                title: Locale.detOtpField,
                value() {
                    return model.otpGenerator;
                },
                sequence: '{TOTP}',
                readonly: true,
                needsTouch: model.needsTouch,
                deviceShortName: model.device.shortName
            })
        );
    } else {
        const writeableFiles = AppModel.instance.files.filter(
            (file) => file.active && !file.readOnly
        );
        if (model.isJustCreated && writeableFiles.length > 1) {
            const fileNames = writeableFiles.map((file) => {
                return { id: file.id, value: file.name, selected: file === model.file };
            });
            fieldViews.push(
                new FieldViewSelect({
                    name: '$File',
                    title: StringFormat.capFirst(Locale.file),
                    value() {
                        return fileNames;
                    }
                })
            );
        } else {
            if (model.backend) {
                fieldViewsAside.push(
                    new FieldViewReadOnly({
                        name: 'Storage',
                        title: StringFormat.capFirst(Locale.storage),
                        value() {
                            return model.fileName;
                        }
                    })
                );
            } else {
                fieldViewsAside.push(
                    new FieldViewReadOnly({
                        name: 'File',
                        title: StringFormat.capFirst(Locale.file),
                        value() {
                            return model.fileName;
                        }
                    })
                );
            }
        }
        fieldViews.push(
            new FieldViewAutocomplete({
                name: '$UserName',
                title: StringFormat.capFirst(Locale.user),
                value() {
                    return model.user;
                },
                getCompletions: detailsView.getUserNameCompletions.bind(detailsView),
                sequence: '{USERNAME}'
            })
        );
        fieldViews.push(
            new FieldViewText({
                name: '$Password',
                title: StringFormat.capFirst(Locale.password),
                canGen: true,
                value() {
                    return model.password;
                },
                sequence: '{PASSWORD}'
            })
        );
        fieldViews.push(
            new FieldViewUrl({
                name: '$URL',
                title: StringFormat.capFirst(Locale.website),
                value() {
                    return model.url;
                },
                sequence: '{URL}'
            })
        );
        fieldViews.push(
            new FieldViewText({
                name: '$Notes',
                title: StringFormat.capFirst(Locale.notes),
                multiline: 'true',
                markdown: true,
                value() {
                    return model.notes;
                },
                sequence: '{NOTES}'
            })
        );
        if (model.file.supportsTags) {
            fieldViews.push(
                new FieldViewTags({
                    name: 'Tags',
                    title: StringFormat.capFirst(Locale.tags),
                    tags: AppModel.instance.tags,
                    value() {
                        return model.tags;
                    }
                })
            );
        }
        if (model.file.supportsExpiration) {
            fieldViews.push(
                new FieldViewDate({
                    name: 'Expires',
                    title: Locale.detExpires,
                    lessThanNow: '(' + Locale.detExpired + ')',
                    value() {
                        return model.expires;
                    }
                })
            );
        }
        fieldViewsAside.push(
            new FieldViewReadOnly({
                name: 'Group',
                title: Locale.detGroup,
                value() {
                    return model.groupName;
                },
                tip() {
                    return model.getGroupPath().join(' / ');
                }
            })
        );
        if (model.created) {
            fieldViewsAside.push(
                new FieldViewReadOnly({
                    name: 'Created',
                    title: Locale.detCreated,
                    value() {
                        return DateFormat.dtStr(model.created);
                    }
                })
            );
        }
        if (model.updated) {
            fieldViewsAside.push(
                new FieldViewReadOnly({
                    name: 'Updated',
                    title: Locale.detUpdated,
                    value() {
                        return DateFormat.dtStr(model.updated);
                    }
                })
            );
        }
        if (!model.backend) {
            fieldViewsAside.push(
                new FieldViewHistory({
                    name: 'History',
                    title: StringFormat.capFirst(Locale.history),
                    value() {
                        return { length: model.historyLength, unsaved: model.unsaved };
                    }
                })
            );
        }
        if (otpEntry) {
            fieldViews.push(
                new FieldViewOtp({
                    name: '$otp',
                    title: Locale.detOtpField,
                    value() {
                        return otpEntry.otpGenerator;
                    },
                    sequence: '{TOTP}',
                    readonly: true,
                    needsTouch: otpEntry.needsTouch,
                    deviceShortName: otpEntry.device.shortName
                })
            );
        }
        for (const field of Object.keys(model.fields)) {
            if (field === 'otp' && model.otpGenerator) {
                if (!otpEntry) {
                    fieldViews.push(
                        new FieldViewOtp({
                            name: '$' + field,
                            title: Locale.detOtpField,
                            value() {
                                return model.otpGenerator;
                            },
                            sequence: '{TOTP}'
                        })
                    );
                }
            } else {
                const isUrl = field.startsWith(ExtraUrlFieldName);
                if (isUrl) {
                    fieldViews.push(
                        new FieldViewUrl({
                            name: '$' + field,
                            title: StringFormat.capFirst(Locale.website),
                            isExtraUrl: true,
                            value() {
                                return model.fields[field];
                            },
                            sequence: `{S:${field}}`
                        })
                    );
                } else {
                    fieldViews.push(
                        new FieldViewCustom({
                            name: '$' + field,
                            title: field,
                            multiline: true,
                            value() {
                                return model.fields[field];
                            },
                            sequence: `{S:${field}}`
                        })
                    );
                }
            }
        }
    }

    return { fieldViews, fieldViewsAside };
}

function createNewCustomField(newFieldTitle, newFieldOptions, model) {
    const isUrl = newFieldTitle.startsWith(ExtraUrlFieldName);

    if (isUrl) {
        return new FieldViewUrl(
            {
                name: '$' + newFieldTitle,
                title: StringFormat.capFirst(Locale.website),
                newField: newFieldTitle,
                isExtraUrl: true,
                value: () => model.fields[newFieldTitle]
            },
            newFieldOptions
        );
    } else {
        return new FieldViewCustom(
            {
                name: '$' + newFieldTitle,
                title: newFieldTitle,
                newField: newFieldTitle,
                multiline: true,
                value: () => ''
            },
            newFieldOptions
        );
    }
}

export { createDetailsFields, createNewCustomField };
