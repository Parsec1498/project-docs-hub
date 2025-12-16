import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ApolloProvider } from '@apollo/client';
import { useApollo } from '../utils/apolloClient';
import { AuthProvider } from '../utils/authContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  const apolloClient = useApollo();
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </ApolloProvider>
  );
}