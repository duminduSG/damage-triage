import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { ApiClient } from './api-client.js';
import { schema } from './schema.js';

const api = new ApiClient(process.env.API_URL ?? 'http://localhost:3001');
const yoga = createYoga({ schema, context: () => ({ api }) });

const port = Number(process.env.PORT ?? 4000);
createServer(yoga).listen(port, () => {
  console.log(`bff listening on http://localhost:${port}/graphql`);
});
