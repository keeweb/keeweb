import { View } from 'framework/views/view';
import {
    createKdbxDatabase,
    createSharedPasswordBank,
    generatePasswordForDatabase
} from 'util/passwordbank';
import template from 'templates/create-new-password-bank.hbs';

class CreateNewPasswordBankView extends View {
    parent = '.open__config-wrap';
    template = template;
    events = {
        'click .open__config-btn-cancel': 'cancel',
        'click .open__config-btn-ok': 'create',
        'change #open__config-field-type': 'typeSet',
        'input input': 'checkValidity'
    };

    constructor(tenantsAvailableForCreate) {
        super();
        this.tenantsAvailableForCreate = tenantsAvailableForCreate;
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
            data.tenantId = document.getElementById('open__config-field-tenant').value;
            data.title = this.getTitleField().value;
        } else {
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
        const formData = this.getFormData();
        const password = generatePasswordForDatabase();
        const db = createKdbxDatabase(formData.title, password);
        if (formData.type === 'Shared') {
            await createSharedPasswordBank(formData.tenantId, formData.title, password, db);
        }
        this.emit('create', formData);
    }
}
export { CreateNewPasswordBankView };
