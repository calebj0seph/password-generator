const browserList = require('./browserlist');

module.exports = {
  plugins: {
    autoprefixer: {
      browsers: browserList,
      grid: true,
    },
  },
};
