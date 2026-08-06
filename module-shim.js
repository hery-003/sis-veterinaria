module.exports = {
  createRequire: () => (id) => { throw new Error('Cannot require ' + id); }
};
