import { expect } from 'chai';
import * as kdbxweb from 'kdbxweb';
import { FileModel } from 'models/file-model';
import { EntryModel } from 'models/entry-model';

// These tests cover the sync race that could push an entry to storage before its
// username/password were typed, and then mark the file as fully synced (silently
// dropping the un-uploaded fields). The fix tracks a modification counter so a
// sync can tell whether the database was edited after its data snapshot was taken.
describe('FileModel sync race', () => {
    const createFile = () => {
        const file = new FileModel({ id: 'f1' });
        file.create('test', () => {});
        return file;
    };

    describe('modificationId', () => {
        it('starts at zero on a freshly created file', () => {
            const file = createFile();
            expect(file.modificationId).to.eql(0);
        });

        it('is bumped by setModified', () => {
            const file = createFile();
            file.setModified();
            expect(file.modificationId).to.be.above(0);
        });

        it('is bumped silently, without emitting a change event', () => {
            const file = createFile();
            let changed = false;
            file.on('change', () => {
                changed = true;
            });
            file.on('change:modificationId', () => {
                changed = true;
            });
            file.registerModification();
            expect(file.modificationId).to.eql(1);
            expect(changed).to.be.false;
        });

        // The critical regression: typing into a just-created (still "unsaved")
        // entry used to skip the modification path entirely, so a sync in flight
        // could not tell that new data had arrived.
        it('is bumped on every entry edit, even before the entry is first saved', () => {
            const file = createFile();
            const group = file.groups[0];
            const entry = EntryModel.newEntry(group, file);
            const afterCreate = file.modificationId;

            entry.setField('UserName', 'alice');
            const afterUser = file.modificationId;

            entry.setField('Password', kdbxweb.ProtectedValue.fromString('secret'));
            const afterPassword = file.modificationId;

            expect(entry.unsaved).to.be.true;
            expect(afterUser).to.be.above(afterCreate);
            expect(afterPassword).to.be.above(afterUser);
        });
    });

    describe('setSyncComplete', () => {
        it('clears modified/dirty and drops the edit state on a clean sync', () => {
            const file = createFile();
            file.setModified();
            let editStateRemoved = 0;
            file.db.removeLocalEditState = () => editStateRemoved++;

            file.setSyncComplete('path', 'webdav', null, false);

            expect(file.modified).to.be.false;
            expect(file.dirty).to.be.false;
            expect(file.syncing).to.be.false;
            expect(file.syncError).to.be.null;
            expect(editStateRemoved).to.eql(1);
        });

        it('keeps the file modified and preserves the edit state when edited during the sync', () => {
            const file = createFile();
            file.setModified();
            let editStateRemoved = 0;
            file.db.removeLocalEditState = () => editStateRemoved++;

            file.setSyncComplete('path', 'webdav', null, true);

            expect(file.modified).to.be.true;
            expect(file.dirty).to.be.true;
            expect(file.syncing).to.be.false;
            expect(file.syncError).to.be.null;
            expect(editStateRemoved).to.eql(0);
        });

        it('marks entries saved on a clean sync', () => {
            const file = createFile();
            const entry = EntryModel.newEntry(file.groups[0], file);
            expect(entry.unsaved).to.be.true;

            file.setSyncComplete('path', 'webdav', null, false);

            expect(entry.unsaved).to.be.false;
        });

        it('leaves entries unsaved when edited during the sync', () => {
            const file = createFile();
            const entry = EntryModel.newEntry(file.groups[0], file);
            expect(entry.unsaved).to.be.true;

            file.setSyncComplete('path', 'webdav', null, true);

            expect(entry.unsaved).to.be.true;
        });
    });

    // End-to-end reproduction of the reported behaviour, following the exact
    // sequence syncFile performs: snapshot the data, then (while the upload is in
    // flight) the user fills in the fields, then the sync completes.
    describe('the empty-entry race', () => {
        it('does not treat edits made between snapshot and completion as saved', () => {
            const file = createFile();
            const entry = EntryModel.newEntry(file.groups[0], file);

            // syncFile serializes the data here — only the empty entry is captured.
            const dataModificationId = file.modificationId;

            // The WebDAV upload is in flight; the user types the credentials.
            entry.setField('UserName', 'alice');
            entry.setField('Password', kdbxweb.ProtectedValue.fromString('secret'));

            // syncFile computes this on completion and passes it to setSyncComplete.
            const editedDuringSync = file.modificationId !== dataModificationId;
            expect(editedDuringSync).to.be.true;

            file.setSyncComplete('path', 'webdav', null, editedDuringSync);

            // The credentials are not silently considered synced — another sync is due.
            expect(file.modified).to.be.true;
            expect(file.dirty).to.be.true;
            expect(entry.unsaved).to.be.true;
        });

        it('regression check: a sync with no concurrent edits clears the modified state', () => {
            const file = createFile();
            EntryModel.newEntry(file.groups[0], file);

            const dataModificationId = file.modificationId;
            // No edits happen during the sync.
            const editedDuringSync = file.modificationId !== dataModificationId;
            expect(editedDuringSync).to.be.false;

            file.setSyncComplete('path', 'webdav', null, editedDuringSync);

            expect(file.modified).to.be.false;
            expect(file.dirty).to.be.false;
        });
    });
});
