// Inject node binary dir into PATH before Turbopack spawns worker processes
const nodeBinDir = require('os').homedir() + '/node-v22.14.0-darwin-arm64/bin';
if (!process.env.PATH || !process.env.PATH.includes(nodeBinDir)) {
  process.env.PATH = nodeBinDir + ':' + (process.env.PATH || '');
}
