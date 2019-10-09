const childProcess = require('child_process');

// remove this once wine can be run on macOS

const childProcessSpawn = childProcess.spawn;

function hookedSpawn(command, options) {
    if (command === 'wine') {
        options = options.map(option => {
            if (option.includes(' ')) {
                option = `"${option.replace('"', '\\"')}"`;
            }
            return option;
        });
    }
    return childProcessSpawn.call(childProcess, command, options);
}

module.exports.setup = function() {
    childProcess.spawn = hookedSpawn;
};
