const mongoose = require('mongoose');

const dbConfig = {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/zippybook',
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
};

module.exports = dbConfig;
