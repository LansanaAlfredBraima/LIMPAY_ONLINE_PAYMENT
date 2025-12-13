const db = require('../database');

db.all("PRAGMA table_info(users)", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(JSON.stringify(rows, null, 2));
});
