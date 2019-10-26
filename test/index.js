function requireAll(req) {
    req.keys().forEach(req);
}
requireAll(require.context('test/src/', true, /\.js$/));
