import { expect } from 'chai';
import { Model } from 'framework/model';

describe('Model', () => {
    it('should create a model with default properties', () => {
        class MyModel extends Model {}
        MyModel.defineModelProperties({ prop: 'default' });

        const myModel = new MyModel();

        expect(myModel).to.be.ok;
        expect(myModel.prop).to.eql('default');
        expect(myModel.another).to.be.undefined;
    });
});
