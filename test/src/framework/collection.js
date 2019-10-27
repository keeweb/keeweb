import { expect } from 'chai';
import { Model } from 'framework/model';
import { Collection } from 'framework/collection';

describe('Collection', () => {
    class TestModel extends Model {
        constructor(id) {
            super();
            this.id = id;
        }
    }
    TestModel.defineModelProperties({ id: 'bar' });

    class TestCollection extends Collection {
        static model = TestModel;
    }

    it('should create a collection without models', () => {
        const collection = new TestCollection();

        expect(collection).to.be.ok;
        expect(collection.length).to.eql(0);
    });

    it('should create a collection with models', () => {
        const collection = new TestCollection([new TestModel('1'), new TestModel('2')]);

        expect(collection).to.be.ok;
        expect(collection.length).to.eql(2);
        expect(collection[0]).to.be.ok;
        expect(collection[0].id).to.eql('1');
        expect(collection[1]).to.be.ok;
        expect(collection[1].id).to.eql('2');
        expect(collection[2]).to.be.undefined;
    });

    it('should check types when adding new items', () => {
        const collection = new TestCollection();

        expect(() => {
            collection.push({ id: 'bar' });
        }).to.throw();
    });

    it('should serialize a collection to JSON', () => {
        const collection = new TestCollection([new TestModel('1'), new TestModel('2')]);

        expect(JSON.stringify(collection)).to.eql('[{"id":"1"},{"id":"2"}]');
    });

    it('should add models with push', () => {
        const collection = new TestCollection();

        const callsChange = [];
        const callsAdd = [];

        collection.on('change', (...args) => callsChange.push(args));
        collection.on('add', (...args) => callsAdd.push(args));

        expect(JSON.stringify(collection)).to.eql('[]');

        const model1 = new TestModel(1);
        collection.push(model1);
        expect(callsChange).to.eql([[{ added: [model1], removed: [] }, collection]]);
        expect(callsAdd).to.eql([[model1, collection]]);
        expect(collection.length).to.eql(1);
        expect(JSON.stringify(collection)).to.eql('[{"id":1}]');
        callsChange.length = 0;
        callsAdd.length = 0;

        const modelA = new TestModel('a');
        const modelB = new TestModel('b');
        collection.push(modelA, modelB);
        expect(callsChange).to.eql([[{ added: [modelA, modelB], removed: [] }, collection]]);
        expect(callsAdd).to.eql([[modelA, collection], [modelB, collection]]);
        expect(collection.length).to.eql(3);
        expect(JSON.stringify(collection)).to.eql('[{"id":1},{"id":"a"},{"id":"b"}]');
    });

    it('should add models with unshift', () => {
        const collection = new TestCollection([new TestModel(1)]);

        const callsChange = [];
        const callsAdd = [];

        collection.on('change', (...args) => callsChange.push(args));
        collection.on('add', (...args) => callsAdd.push(args));

        expect(JSON.stringify(collection)).to.eql('[{"id":1}]');

        const model2 = new TestModel(2);
        collection.unshift(model2);
        expect(callsChange).to.eql([[{ added: [model2], removed: [] }, collection]]);
        expect(callsAdd).to.eql([[model2, collection]]);
        expect(collection.length).to.eql(2);
        expect(JSON.stringify(collection)).to.eql('[{"id":2},{"id":1}]');
        callsChange.length = 0;
        callsAdd.length = 0;

        const modelA = new TestModel('a');
        const modelB = new TestModel('b');
        collection.unshift(modelA, modelB);
        expect(callsChange).to.eql([[{ added: [modelA, modelB], removed: [] }, collection]]);
        expect(callsAdd).to.eql([[modelA, collection], [modelB, collection]]);
        expect(collection.length).to.eql(4);
        expect(JSON.stringify(collection)).to.eql('[{"id":"a"},{"id":"b"},{"id":2},{"id":1}]');
    });

    it('should remove models with pop', () => {
        const model1 = new TestModel(1);
        const model2 = new TestModel(2);
        const collection = new TestCollection([model1, model2]);

        const callsChange = [];
        const callsRemove = [];

        collection.on('change', (...args) => callsChange.push(args));
        collection.on('remove', (...args) => callsRemove.push(args));

        expect(JSON.stringify(collection)).to.eql('[{"id":1},{"id":2}]');

        const popped1 = collection.pop();
        expect(popped1).to.eql(model2);
        expect(callsChange).to.eql([[{ added: [], removed: [model2] }, collection]]);
        expect(callsRemove).to.eql([[model2, collection]]);
        expect(collection.length).to.eql(1);
        expect(JSON.stringify(collection)).to.eql('[{"id":1}]');
        callsChange.length = 0;
        callsRemove.length = 0;

        const popped2 = collection.pop();
        expect(popped2).to.eql(model1);
        expect(callsChange).to.eql([[{ added: [], removed: [model1] }, collection]]);
        expect(callsRemove).to.eql([[model1, collection]]);
        expect(JSON.stringify(collection)).to.eql('[]');
        callsChange.length = 0;
        callsRemove.length = 0;

        const popped3 = collection.pop();
        expect(popped3).to.be.undefined;
        expect(callsChange).to.eql([]);
        expect(callsRemove).to.eql([]);
        expect(JSON.stringify(collection)).to.eql('[]');
    });

    it('should remove models with shift', () => {
        const model1 = new TestModel(1);
        const model2 = new TestModel(2);
        const collection = new TestCollection([model1, model2]);

        const callsChange = [];
        const callsRemove = [];

        collection.on('change', (...args) => callsChange.push(args));
        collection.on('remove', (...args) => callsRemove.push(args));

        expect(JSON.stringify(collection)).to.eql('[{"id":1},{"id":2}]');

        const shifted1 = collection.shift();
        expect(shifted1).to.eql(model1);
        expect(callsChange).to.eql([[{ added: [], removed: [model1] }, collection]]);
        expect(callsRemove).to.eql([[model1, collection]]);
        expect(collection.length).to.eql(1);
        expect(JSON.stringify(collection)).to.eql('[{"id":2}]');
        callsChange.length = 0;
        callsRemove.length = 0;

        const shifted2 = collection.shift();
        expect(shifted2).to.eql(model2);
        expect(callsChange).to.eql([[{ added: [], removed: [model2] }, collection]]);
        expect(callsRemove).to.eql([[model2, collection]]);
        expect(collection.length).to.eql(0);
        expect(JSON.stringify(collection)).to.eql('[]');
        callsChange.length = 0;
        callsRemove.length = 0;

        const shifted3 = collection.shift();
        expect(shifted3).to.be.undefined;
        expect(callsChange).to.eql([]);
        expect(callsRemove).to.eql([]);
        expect(collection.length).to.eql(0);
        expect(JSON.stringify(collection)).to.eql('[]');
    });

    it('should remove models by setting length', () => {
        const model1 = new TestModel(1);
        const model2 = new TestModel(2);
        const model3 = new TestModel(3);
        const collection = new TestCollection([model1, model2, model3]);

        const callsChange = [];
        const callsRemove = [];

        collection.on('change', (...args) => callsChange.push(args));
        collection.on('remove', (...args) => callsRemove.push(args));

        expect(JSON.stringify(collection)).to.eql('[{"id":1},{"id":2},{"id":3}]');

        collection.length = 1;
        expect(callsChange).to.eql([[{ added: [], removed: [model2, model3] }, collection]]);
        expect(callsRemove).to.eql([[model2, collection], [model3, collection]]);
        expect(collection.length).to.eql(1);
        expect(JSON.stringify(collection)).to.eql('[{"id":1}]');
        callsChange.length = 0;
        callsRemove.length = 0;

        collection.length = 1;
        expect(callsChange).to.eql([]);
        expect(callsRemove).to.eql([]);
        expect(collection.length).to.eql(1);
        expect(JSON.stringify(collection)).to.eql('[{"id":1}]');

        collection.length = 0;
        expect(callsChange).to.eql([[{ added: [], removed: [model1] }, collection]]);
        expect(callsRemove).to.eql([[model1, collection]]);
        expect(collection.length).to.eql(0);
        expect(JSON.stringify(collection)).to.eql('[]');
    });

    it('should set custom properties', () => {
        const collection = new TestCollection();

        const calls = [];

        collection.on('change', (...args) => calls.push(args));
        collection.on('add', (...args) => calls.push(args));
        collection.on('remove', (...args) => calls.push(args));

        collection.prop = 'val';

        expect(collection.prop).to.eql('val');

        expect(collection.length).to.eql(0);
        expect(JSON.stringify(collection)).to.eql('[]');
        expect(calls).to.eql([]);
    });

    it('should check types when setting items', () => {
        const collection = new TestCollection();

        expect(() => {
            collection[0] = { id: 'bar' };
        }).to.throw();
    });

    it('should set new items', () => {
        const collection = new TestCollection();

        const callsChange = [];
        const callsAdd = [];
        const callsRemove = [];

        collection.on('change', (...args) => callsChange.push(args));
        collection.on('add', (...args) => callsAdd.push(args));
        collection.on('remove', (...args) => callsRemove.push(args));

        const model = new TestModel(1);
        collection[0] = model;

        expect(collection.length).to.eql(1);
        expect(JSON.stringify(collection)).to.eql('[{"id":1}]');
        expect(callsChange).to.eql([[{ added: [model], removed: [] }, collection]]);
        expect(callsAdd).to.eql([[model, collection]]);
        expect(callsRemove).to.eql([]);
    });

    it('should set existing items', () => {
        const model1 = new TestModel(1);
        const model2 = new TestModel(2);
        const collection = new TestCollection([model1, model2]);

        const callsChange = [];
        const callsAdd = [];
        const callsRemove = [];

        collection.on('change', (...args) => callsChange.push(args));
        collection.on('add', (...args) => callsAdd.push(args));
        collection.on('remove', (...args) => callsRemove.push(args));

        expect(JSON.stringify(collection)).to.eql('[{"id":1},{"id":2}]');

        const model3 = new TestModel(3);
        collection[1] = model3;

        expect(collection.length).to.eql(2);
        expect(JSON.stringify(collection)).to.eql('[{"id":1},{"id":3}]');
        expect(callsChange).to.eql([[{ added: [model3], removed: [model2] }, collection]]);
        expect(callsAdd).to.eql([[model3, collection]]);
        expect(callsRemove).to.eql([[model2, collection]]);
    });

    it('should get items by id', () => {
        const model1 = new TestModel(1);
        const model2 = new TestModel(2);
        const collection = new TestCollection([model1, model2]);

        expect(collection.get(1)).to.eql(model1);
        expect(collection.get(2)).to.eql(model2);
        expect(collection.get(3)).to.be.undefined;
    });

    it('should remove items', () => {
        const model1 = new TestModel(1);
        const model2 = new TestModel(2);
        const collection = new TestCollection([model1, model2]);

        const callsChange = [];
        const callsRemove = [];

        collection.on('change', (...args) => callsChange.push(args));
        collection.on('remove', (...args) => callsRemove.push(args));

        collection.remove(1);

        expect(JSON.stringify(collection)).to.eql('[{"id":2}]');
        expect(callsChange).to.eql([[{ added: [], removed: [model1] }, collection]]);
        expect(callsRemove).to.eql([[model1, collection]]);
        callsChange.length = 0;
        callsRemove.length = 0;

        collection.remove(model2);

        expect(JSON.stringify(collection)).to.eql('[]');
        expect(callsChange).to.eql([[{ added: [], removed: [model2] }, collection]]);
        expect(callsRemove).to.eql([[model2, collection]]);
    });

    it('should sort items by comparator', () => {
        const model1 = new TestModel(1);
        const model2 = new TestModel(2);
        const collection = new TestCollection([model1, model2]);

        expect(JSON.stringify(collection)).to.eql('[{"id":1},{"id":2}]');

        collection.comparator = (x, y) => x.id - y.id;
        collection.sort();
        expect(JSON.stringify(collection)).to.eql('[{"id":1},{"id":2}]');

        collection.comparator = (x, y) => y.id - x.id;
        collection.sort();
        expect(JSON.stringify(collection)).to.eql('[{"id":2},{"id":1}]');
    });

    it('should splice items', () => {
        const model1 = new TestModel(1);
        const model2 = new TestModel(2);
        const model3 = new TestModel(3);
        const collection = new TestCollection([model1, model2, model3]);

        const callsChange = [];
        const callsAdd = [];
        const callsRemove = [];

        collection.on('change', (...args) => callsChange.push(args));
        collection.on('add', (...args) => callsAdd.push(args));
        collection.on('remove', (...args) => callsRemove.push(args));

        expect(JSON.stringify(collection)).to.eql('[{"id":1},{"id":2},{"id":3}]');

        const model4 = new TestModel(4);
        const model5 = new TestModel(5);
        const model6 = new TestModel(6);
        collection.splice(1, 1, model4, model5, model6);

        expect(collection.length).to.eql(5);
        expect(JSON.stringify(collection)).to.eql('[{"id":1},{"id":4},{"id":5},{"id":6},{"id":3}]');
        expect(callsChange).to.eql([
            [{ added: [model4, model5, model6], removed: [model2] }, collection]
        ]);
        expect(callsAdd).to.eql([[model4, collection], [model5, collection], [model6, collection]]);
        expect(callsRemove).to.eql([[model2, collection]]);
    });
});
