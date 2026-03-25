import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegistrationPage } from './pages/RegistrationPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RegistrationPage />
  </QueryClientProvider>
);

export default App;
