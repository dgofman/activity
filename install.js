try {
    const fs = require('fs'),
        childProcess = require("child_process"),
        dir = childProcess.execSync("npm root -g").toString().trim();
    console.log(`dir: ${dir}`);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    try {
        console.log("typescript: " + require(`${dir}/typescript/package.json`).version);
    } catch (e) {
        console.log(childProcess.execSync("npm install typescript -g", {cwd: dir}).toString());
    }

    try {
        console.log("ts-node: " + require(`${dir}/ts-node/package.json`).version);
    } catch (e) {
        console.log(childProcess.execSync("npm install ts-node -g", {cwd: dir}).toString());
    }
} catch (e) {
    console.error(e);
}