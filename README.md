# Our Stuff on your device

Our Stuff runs locally as a free tracker for notes, goals, calendars, and Spaces. You can use it without an account.

## Start and reopen

1. Download and extract this project release. Install Python 3 from [python.org](https://www.python.org/downloads/) if your device needs it.
2. Open a terminal in the extracted folder and run `python3 standalone.py`. On Windows with the Python launcher, use `py -3 standalone.py`.
3. Open [http://127.0.0.1:8768/](http://127.0.0.1:8768/) in your regular browser profile. Press Ctrl+C in the terminal to stop the server.

Start it again with the same command and reopen the same address in the same browser profile. The local address opens only on the device running the server. Your browser profile stores the data for that address in local storage and IndexedDB. A private window, a different profile, or a different address has separate storage.

Use the [hosted dashboard](https://ourstuff.space/) to share across people or devices. The Maps links and other external resources need a connection when you open them. Maps searches and tiles use their usual network services.

## Back up and restore

1. In the dashboard, open the Space you want to save. From **Settings → Data Controls**, select **Export**. Save one JSON backup per Space. The file contains this browser’s records, history, and stored attachment data for that Space.
2. In the new browser profile, start the dashboard and open the matching Space. Recreate a custom Space using the same slot first.
3. Open **Settings → Data Controls → Import**, select the JSON file, and confirm. Import replaces that Space’s app data. Open **Space history** and **Gallery** to check that its records and attachments are there.

Export before clearing site data or changing browser profiles. A backup may contain private notes, attachments, and letters. Keep it with the other files you protect for that Space.

## Recover earlier letters

A local export includes any earlier Pyxida settings, letters, and attachment data already stored in that Space. Imported archives stay in the backup and are available in a later export. Open the JSON file to recover their contents.

For letters stored in a hosted Space, sign in, open the Space, and choose **Settings → Data Controls → Export with legacy letters**. That download includes earlier settings, letters, and attachments the account can still read. The file lists any referenced attachments the service could not return.
