# Project Docs Hub

This repository contains a simple reference implementation of the **Project Docs Hub**, a documentation platform that allows teams to create and edit hierarchical pages, view navigation trees and manage content via a GraphQL API.  The code provided here is a minimal working prototype meant to illustrate how one might start implementing the architectural design described in the specification.  It includes:

* A **Node.js** back‑end using **Express** and **Apollo Server** to expose a GraphQL API.  Data is stored in a local JSON file via `lowdb` for simplicity.  You can swap this out for a relational database (e.g., PostgreSQL) in a production deployment.
* A **Next.js** front‑end that communicates with the GraphQL API via Apollo Client.  It includes pages for login, listing and viewing pages, and editing content using the **Tiptap** WYSIWYG editor.

The implementation is deliberately minimal and does not include all features from the full specification (e.g., Corezoid import, search indexing, ACL enforcement).  It provides a starting point that can be extended.

## Running locally

You will need **Node.js 16+** installed on your system.  To run both the back‑end and front‑end locally:

```bash
# Clone or extract this repository
cd project-docs-hub

# Install and run the back‑end
cd backend
npm install
npm start     # starts the GraphQL API on http://localhost:4000

# In a separate terminal, run the front‑end
cd ../frontend
npm install
npm run dev   # starts Next.js on http://localhost:3000
```

Open <http://localhost:3000> in your browser.  Use the login page (any username/password will work for this prototype) to obtain a session token.

## Deployment on Ubuntu server

To deploy on a remote Ubuntu server you can install Node.js and copy this project’s `backend` and `frontend` directories.  Then run `npm install` and `npm run build` in the `frontend` directory and `npm install` in the `backend` directory.  Start the back‑end with `npm start` and the front‑end with `npm start` (after building) or behind a process manager like **PM2**.  Configure Nginx or another reverse proxy to proxy `/graphql` to the back‑end and serve the front‑end.

## Extending the prototype

This prototype uses a simple JSON database.  To meet production requirements you should:

* Replace the `lowdb` store with a relational database like PostgreSQL and use an ORM (Prisma, TypeORM, Sequelize).
* Implement authentication via Bitrix SSO and enforce ACLs for roles, blacklists and whitelists.
* Add modules for importing Corezoid JSON, linking and graph generation, search indexing and other domain‑specific documentation features as described in the architecture documents.

Pull requests and contributions are welcome!