import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

/**
 * Creates a new ApolloClient instance configured to talk to the
 * GraphQL API provided by the back‑end.  It adds the `Authorization`
 * header on every request using the token stored in localStorage.
 *
 * We wrap the client creation in a function so that it can be
 * reinitialised after login/logout events.  Next.js will call
 * this on every render of the custom App component.
 */
export function useApollo() {
  const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URI || 'http://localhost:4000/graphql',
  });
  const authLink = setContext((_, { headers }) => {
    // Read the token from localStorage if we are running in the browser.
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token');
    }
    return {
      headers: {
        ...headers,
        Authorization: token ? `Bearer ${token}` : '',
      },
    };
  });
  const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  });
  return client;
}