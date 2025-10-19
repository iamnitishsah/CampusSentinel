import Landing from './pages/landing/page';
import ProtectedRoute from './components/protectedRoute';

export default function Home() {
    return (
        <ProtectedRoute>
            <Landing />
        </ProtectedRoute>
    );
}
