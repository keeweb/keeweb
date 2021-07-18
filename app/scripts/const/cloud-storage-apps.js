// Secrets are not really secrets and are supposed to be embedded in the app code according to
//  the Google's guide: https://developers.google.com/identity/protocols/oauth2#installed
// The process results in a client ID and, in some cases, a client secret,
//  which you embed in the source code of your application.
//  (In this context, the client secret is obviously not treated as a secret.)

const DropboxApps = {
    AppFolder: { id: 'qp7ctun6qt5n9d6', secret: '07s5r4ck1uvlj6a' },
    FullDropbox: { id: 'eor7hvv6u6oslq9', secret: 'ez04o1iwf6yprq3' }
};

const GDriveApps = {
    Local: {
        id: '783608538594-36tkdh8iscrq8t8dq87gghubnhivhjp5.apps.googleusercontent.com',
        secret: 'yAtyfc9TIQ9GyQgQmo3i0HAP'
    },
    Production: {
        id: '847548101761-koqkji474gp3i2gn3k5omipbfju7pbt1.apps.googleusercontent.com',
        secret: '42HeSBybXDZjvweotq4o4CkJ'
    },
    Desktop: {
        id: '847548101761-h2pcl2p6m1tssnlqm0vrm33crlveccbr.apps.googleusercontent.com',
        secret: 'nTSCiqXtUNmURIIdASaC1TJK'
    }
};

const OneDriveApps = {
    Local: {
        id: 'b97c53d5-db5b-4124-aab9-d39195293815'
    },
    Production: {
        id: 'bbc74d1b-3a9c-46e6-9da4-4c645e830923'
    },
    Desktop: {
        id: 'bbc74d1b-3a9c-46e6-9da4-4c645e830923',
        secret: 'aOMJaktJEAs_Tmh]fx4iQ[Zd3mp3KK7-'
    }
};

const MsTeamsApps = {
    Local: {
        id: '8fbe2245-13d5-446f-bedc-74c3b2e1f635'
    },
    Production: {
        id: '8fbe2245-13d5-446f-bedc-74c3b2e1f635'
    },
    Desktop: {
        id: '8fbe2245-13d5-446f-bedc-74c3b2e1f635',
        secret: 'F02~HYaWs-~7MndJcVRtv9~h-50Brk_9ho'
    }
};

export { DropboxApps, GDriveApps, OneDriveApps, MsTeamsApps };
