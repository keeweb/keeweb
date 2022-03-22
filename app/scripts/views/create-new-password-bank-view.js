import { View } from 'framework/views/view';
import {
    createKdbxDatabase,
    createSharedPasswordBank,
    generatePasswordForDatabase
} from 'util/passwordbank';
import template from 'templates/create-new-password-bank.hbs';
import { FileModel } from 'models/file-model';
import { FileInfoModel } from 'models/file-info-model';
import { IdGenerator } from 'util/generators/id-generator';

class CreateNewPasswordBankView extends View {
    parent = '.open__config-wrap';
    template = template;
    events = {
        'click .open__config-btn-cancel': 'cancel',
        'click .open__config-btn-ok': 'create',
        'change #open__config-field-type': 'typeSet',
        'input input': 'checkValidity'
    };

    constructor(model) {
        super();
        this.tenantsAvailableForCreate = model.settings.tenantsAvailableForCreate;
        this.model = model;
    }

    getType() {
        return document.getElementById('open__config-field-type').value;
    }

    getTitleField() {
        return document.getElementById('open__config-field-title');
    }

    render() {
        super.render({
            tenantsAvailableForCreate: this.tenantsAvailableForCreate
        });
        this.typeSet();
    }

    typeSet() {
        const type = this.getType();
        this.hideFieldsBasedOnType(type);
        this.checkValidity();
    }

    hideFieldsBasedOnType(type) {
        if (type === 'Personal') {
            document.getElementById('shared-fields').classList.add('hide');
        } else {
            document.getElementById('shared-fields').classList.remove('hide');
        }
    }

    checkValidity() {
        this.setError('');
        const type = this.getType();
        let isValid = false;
        if (type === 'Personal') {
            isValid = true;
        } else {
            isValid = this.getTitleField().checkValidity();
        }
        this.$el.find('.open__config-btn-ok').prop('disabled', !isValid);
        return isValid;
    }

    getFormData() {
        const data = {};
        data.type = this.getType();
        if (data.type === 'Shared') {
            const tenantSelector = document.getElementById('open__config-field-tenant');
            data.tenantId = tenantSelector.value;
            data.tenantName = tenantSelector.options[tenantSelector.selectedIndex].text;
            data.title = this.getTitleField().value.trim();
        } else {
            data.tenantName = '';
            throw 'Personal password bank is not implemented yet!!';
        }
        return data;
    }

    cancel() {
        this.emit('cancel');
    }

    async create() {
        if (!this.checkValidity()) {
            return;
        }
        const okButton = this.$el.find('.open__config-btn-ok');
        okButton.prop('disabled', true);
        const formData = this.getFormData();
        // todo add upload function of existing database with provided password
        const password = generatePasswordForDatabase();
        const db = createKdbxDatabase(formData.title, password);
        let path, icon;
        try {
            if (formData.type === 'Shared') {
                path = await createSharedPasswordBank(
                    formData.tenantId,
                    formData.title,
                    password,
                    db
                );
                icon = 'users';
            }
        } catch (error) {
            this.setError(error.message);
            okButton.prop('disabled', false);
            return;
        }
        const newFile = new FileModel({
            id: IdGenerator.uuid(),
            db,
            name: formData.title,
            tenantName: formData.tenantName,
            storage: 'webdav',
            path,
            writeAccess: true,
            deleteAccess: true
        });
        newFile.readModel();
        newFile.set({ active: true, name: newFile.name });
        const fileInfo = new FileInfoModel({
            id: newFile.id,
            name: formData.title,
            storage: 'webdav',
            path,
            tenantName: formData.tenantName,
            icon,
            writeAccess: true,
            deleteAccess: true
        });
        this.model.fileInfos.unshift(fileInfo);
        this.model.addFile(newFile);
    }

    setError(error) {
        this.$el.find('.open__config-error').text(error);
    }
}
export { CreateNewPasswordBankView };
