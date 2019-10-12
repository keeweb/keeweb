import { expect } from 'chai';
import { Model } from 'framework/model';

describe('Model', () => {
    class TestModel extends Model {}
    TestModel.defineModelProperties({ foo: 'bar', baz: 0 });

    class TestExtensibleModel extends Model {}
    TestExtensibleModel.defineModelProperties({ foo: 'bar' }, { extensions: true });

    it('should create a model with default properties', () => {
        const model = new TestModel();

        expect(model).to.be.ok;
        expect(model.foo).to.eql('bar');
        expect(model.baz).to.eql(0);
        expect(model.another).to.be.undefined;
    });

    it('should serialize a model to JSON', () => {
        const model = new TestModel();

        model.baz = 1;

        expect(JSON.stringify(model)).to.eql('{"foo":"bar","baz":1}');
    });

    it('should throw an error for unknown properties', () => {
        const model = new TestModel();
        expect(() => {
            model.xxx = 'value';
        }).to.throw();
    });

    it('should set properties', () => {
        const model = new TestModel();

        const calls = [];
        const callsProp = [];
        const callsAnother = [];

        model.on('change', (...args) => calls.push(args));
        model.on('change:foo', (...args) => callsProp.push(args));
        model.on('change:baz', (...args) => callsAnother.push(args));

        model.foo = 123;

        expect(model.foo).to.eql(123);
        expect(calls).to.eql([[model, { foo: 123 }]]);
        expect(callsProp).to.eql([[model, 123, 'bar']]);
        expect(callsAnother).to.eql([]);
    });

    it('should set properties using "set" method', () => {
        const model = new TestModel();

        const calls = [];
        const callsProp = [];
        const callsAnother = [];

        model.on('change', (...args) => calls.push(args));
        model.on('change:foo', (...args) => callsProp.push(args));
        model.on('change:baz', (...args) => callsAnother.push(args));

        model.set({ foo: 123, baz: 456 });

        expect(model.foo).to.eql(123);
        expect(model.baz).to.eql(456);
        expect(calls).to.eql([[model, { foo: 123, baz: 456 }]]);
        expect(callsProp).to.eql([[model, 123, 'bar']]);
        expect(callsAnother).to.eql([[model, 456, 0]]);
    });

    it('should silently set properties using "set" method', () => {
        const model = new TestModel();

        const calls = [];
        const callsProp = [];
        const callsAnother = [];

        model.on('change', (...args) => calls.push(args));
        model.on('change:foo', (...args) => callsProp.push(args));
        model.on('change:baz', (...args) => callsAnother.push(args));

        model.set({ foo: 123, baz: 456 }, { silent: true });

        expect(model.foo).to.eql(123);
        expect(model.baz).to.eql(456);
        expect(calls).to.eql([]);
        expect(callsProp).to.eql([]);
        expect(callsAnother).to.eql([]);
    });

    it('should delete properties', () => {
        const model = new TestModel();

        model.foo = 123;

        const calls = [];
        const callsProp = [];
        const callsAnother = [];

        model.on('change', (...args) => calls.push(args));
        model.on('change:foo', (...args) => callsProp.push(args));
        model.on('change:baz', (...args) => callsAnother.push(args));

        delete model.foo;

        expect(model.foo).to.eql('bar');
        expect(calls).to.eql([[model, { foo: 'bar' }]]);
        expect(callsProp).to.eql([[model, 'bar', 123]]);
        expect(callsAnother).to.eql([]);
    });

    it('should allow extensions for extensible models', () => {
        const model = new TestExtensibleModel();

        expect(model.foo).to.eql('bar');

        const calls = [];
        model.on('change', (...args) => calls.push(args));

        model.foo = 123;
        model.xxx = 456;

        expect(model.foo).to.eql(123);
        expect(model.xxx).to.eql(456);

        expect(model).to.have.property('xxx');
        expect(JSON.stringify(model)).to.eql('{"foo":123,"xxx":456}');

        delete model.xxx;

        expect(model).to.not.have.property('xxx');
        expect(model.xxx).to.be.undefined;
        expect(JSON.stringify(model)).to.eql('{"foo":123}');

        expect(calls).to.eql([
            [model, { foo: 123 }],
            [model, { xxx: 456 }],
            [model, { xxx: undefined }]
        ]);
    });
});
