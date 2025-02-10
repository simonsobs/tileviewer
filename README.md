# Tileviewer

This is the user interface for the SO Map Viewer. The client is built with [React](https://react.dev/) and bundled by [vite](https://vite.dev/). The underlying mapping components are built with [leaflet.js](https://leafletjs.com/) and [react-leaflet](https://react-leaflet.js.org/).

## Steps to run locally

1. Clone and initialize this repo:

```sh
git clone git@github.com:simonsobs/tileviewer.git
cd tileviewer
npm install
```

2. Set up a `.env.development` file. The contents of `env.development.sample` should suffice if you plan to serve the map tiles using [the SO Tilemaker](https://github.com/simonsobs/tilemaker)

3. Depending on your tile server setup:

   3A. If using the SO Tilemaker:

   - Clone the repo and [follow its README instructions](https://github.com/simonsobs/tilemaker#readme) for creating a `SQLite` database.
   - Amend the `settings.py` file as follows:

   ```py
     # vite's dev server is configured to be on port 8080; amend as desired.
     origins: list[str] | None = ["http://localhost:8080"]
     add_cors: bool = True
   ```

   - Run the tile server locally via `uvicorn tilemaker.server:app --port=9191 --reload`

   3B. If using your own tile server:

   - Set the `VITE_SERVICE_URL` environment variable in `.env.development` to point to your local server
   - Run your tile server locally

4. Run the client dev server via `npm run dev`
