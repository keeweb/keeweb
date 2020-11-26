function requireAll(req) {
    req.keys().forEach((mod) => {
        try {
            req(mod);
        } catch (ex) {
            // eslint-disable-next-line no-console
            console.error('Error while running test', mod, ex.toString());
            if ('testErrors' in global) {
                global.testErrors++;
            }
        }
    });
}
requireAll(require.context('test/src/', true, /\.js$/));
