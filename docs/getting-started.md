# Getting Started

`Tileviewer` can be run according to your needs. Here are the two most common ways to run it.

## Bundled into TileMaker

Most users should choose to use the [TileMaker](https://github.com/simonsobs/tilemaker#readme) software to streamline their workflow. `TileMaker` allows users to create and serve data from a SQL database that is compatible with `TileViewer`. The service is built and served by FastAPI, which conveniently can bundle and serve the `TileViewer` user interface as well. [Follow its documentation](https://github.com/simonsobs/tilemaker#readme) to get up and running with this approach.

## Run Both Tilemaker and Tileviewer Locally

This approach makes the most sense when developing or contributing to the `TileViewer` software. In this approach, we will clone `TileViewer` and use Vite to run it locally while pointing it to a locally-run tile service as well.

1. Clone and initialize `TileViewer`

```sh
git clone git@github.com:simonsobs/tileviewer.git
cd tileviewer
npm install
```

2. Create a `.env.development` file by copying the contents from `.env.development.sample`. You may need to amend the `VITE_SERVICE_URL` depending on what port your tile server actually runs on.

3. Depending on your tile server setup:

   3A. If using `TileMaker`:

   - Clone the repo and [follow its README instructions](https://github.com/simonsobs/tilemaker#readme) for generating data and running the server.
   - Amend the `settings.py` file as follows:

   ```py
     # vite's dev server is configured to be on port 8080; amend as desired.
     origins: list[str] | None = ["http://localhost:8080"]
     add_cors: bool = True
   ```

   - Run the tile server locally via `tilemaker serve --port=9191` (if you set a different port in the `.env.development` file, then match it accordingly)

   3B. If using your own tile server:

   - Set the `VITE_SERVICE_URL` environment variable in `.env.development` to point to your local server
   - Run your tile server locally

4. Run the client dev server via `npm run dev` and open a browser with the localhost URL shown in the console.
